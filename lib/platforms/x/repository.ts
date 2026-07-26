import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { decryptSecret, encryptSecret } from './crypto';
import {
  isDefinitiveXAuthorizationError,
  refreshAccessToken,
  revokeXToken,
  type XTokenResponse,
  X_PLATFORM_ID,
} from './oauth';

const ACCESS_TOKEN_PURPOSE = 'x-access-token';
const REFRESH_TOKEN_PURPOSE = 'x-refresh-token';
const REFRESH_WINDOW_MS = 5 * 60 * 1000;
const LIFECYCLE_CLAIM_TTL_MS = 2 * 60 * 1000;
const REFRESH_CONTENDER_ATTEMPTS = 80;
const REFRESH_CONTENDER_DELAY_MS = 250;

function getClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Platform account persistence is not configured');
  }
  return prisma;
}

export interface PlatformConnectionStatus {
  platform: typeof X_PLATFORM_ID;
  connected: boolean;
  status: 'connected' | 'expired' | 'revoked';
  username?: string;
  scopes: string[];
  expiresAt?: string;
  connectedAt?: string;
}

function tokenExpiry(tokens: XTokenResponse): Date {
  return new Date(Date.now() + tokens.expires_in * 1000);
}

function lifecycleClaimIsStale(updatedAt: Date): boolean {
  return updatedAt.getTime() <= Date.now() - LIFECYCLE_CLAIM_TTL_MS;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForWinningRefresh(client: PrismaClient, userId: string): Promise<string> {
  for (let attempt = 0; attempt < REFRESH_CONTENDER_ATTEMPTS; attempt += 1) {
    const account = await client.platformAccount.findUnique({
      where: { userId_platform: { userId, platform: X_PLATFORM_ID } },
    });
    if (!account) throw new Error('X account is not connected');

    if (account.status === 'connected') {
      if (!account.expiresAt || account.expiresAt.getTime() > Date.now()) {
        return decryptSecret(account.encryptedAccessToken, ACCESS_TOKEN_PURPOSE);
      }
      return getValidXAccessToken(userId);
    }
    if (account.status !== 'refreshing') {
      throw new Error('X account is not connected');
    }
    if (lifecycleClaimIsStale(account.updatedAt)) {
      await client.platformAccount.updateMany({
        where: { id: account.id, status: 'refreshing', updatedAt: account.updatedAt },
        data: { status: 'recovery_required' },
      });
      throw new Error('X account refresh was interrupted; authorization recovery is required');
    }
    await wait(REFRESH_CONTENDER_DELAY_MS);
  }
  throw new Error('X account refresh is still in progress');
}

export async function saveXAccount(
  userId: string,
  identity: { id: string; username: string },
  tokens: XTokenResponse
) {
  const client = getClient();
  const encryptedAccessToken = encryptSecret(tokens.access_token, ACCESS_TOKEN_PURPOSE);
  const encryptedRefreshToken = tokens.refresh_token
    ? encryptSecret(tokens.refresh_token, REFRESH_TOKEN_PURPOSE)
    : null;
  const tokenData = {
    providerAccountId: identity.id,
    providerUsername: identity.username,
    encryptedAccessToken,
    encryptedRefreshToken,
    tokenType: tokens.token_type.toLowerCase(),
    scopes: tokens.scope,
    expiresAt: tokenExpiry(tokens),
    status: 'connected',
  } as const;
  const existing = await client.platformAccount.findUnique({
    where: { userId_platform: { userId, platform: X_PLATFORM_ID } },
  });

  if (!existing) {
    return client.platformAccount.create({
      data: {
        userId,
        platform: X_PLATFORM_ID,
        ...tokenData,
      },
    });
  }

  const activeClaim = ['refreshing', 'revoking', 'reconnecting'].includes(existing.status);
  const recoveryRequired = existing.status === 'recovery_required';
  const revocationRequired = existing.status === 'revocation_required';
  if (activeClaim && !lifecycleClaimIsStale(existing.updatedAt)) {
    throw new Error('X account authorization is currently changing');
  }
  const claim = await client.platformAccount.updateMany({
    where: { id: existing.id, status: existing.status, updatedAt: existing.updatedAt },
    data: {
      status: 'reconnecting',
      providerAccountId: identity.id,
      providerUsername: identity.username,
    },
  });
  if (claim.count !== 1) {
    throw new Error('X account authorization changed during reconnect');
  }

  const displacedToken = existing.encryptedRefreshToken
    ? decryptSecret(existing.encryptedRefreshToken, REFRESH_TOKEN_PURPOSE)
    : existing.encryptedAccessToken
      ? decryptSecret(existing.encryptedAccessToken, ACCESS_TOKEN_PURPOSE)
      : null;
  const displacedAuthorizationMayBeLive =
    existing.status === 'connected' || activeClaim || recoveryRequired || revocationRequired;
  if (displacedToken && displacedAuthorizationMayBeLive) {
    try {
      await revokeXToken(displacedToken);
    } catch (error) {
      await client.platformAccount.updateMany({
        where: {
          id: existing.id,
          status: 'reconnecting',
          providerAccountId: identity.id,
          connectedAt: existing.connectedAt,
          encryptedAccessToken: existing.encryptedAccessToken,
          encryptedRefreshToken: existing.encryptedRefreshToken,
        },
        data: {
          status: existing.status === 'connected' ? 'connected' : 'recovery_required',
          providerAccountId: existing.providerAccountId,
          providerUsername: existing.providerUsername,
        },
      });
      throw error;
    }
  }

  const update = await client.platformAccount.updateMany({
    where: {
      id: existing.id,
      status: 'reconnecting',
      providerAccountId: identity.id,
      connectedAt: existing.connectedAt,
      encryptedAccessToken: existing.encryptedAccessToken,
      encryptedRefreshToken: existing.encryptedRefreshToken,
    },
    data: {
      ...tokenData,
      connectedAt: new Date(),
      refreshedAt: null,
      revokedAt: null,
    },
  });
  if (update.count !== 1) {
    throw new Error('X account authorization changed while reconnecting');
  }
  return update;
}

export async function getXConnectionStatus(userId: string): Promise<PlatformConnectionStatus> {
  const account = await getClient().platformAccount.findUnique({
    where: { userId_platform: { userId, platform: X_PLATFORM_ID } },
    select: {
      providerUsername: true,
      scopes: true,
      expiresAt: true,
      encryptedRefreshToken: true,
      status: true,
      connectedAt: true,
      updatedAt: true,
    },
  });

  if (!account || account.status === 'revoked') {
    return { platform: X_PLATFORM_ID, connected: false, status: 'revoked', scopes: [] };
  }

  const accessTokenExpired = Boolean(
    account.expiresAt && account.expiresAt.getTime() <= Date.now()
  );
  const authorizationExpired = accessTokenExpired && !account.encryptedRefreshToken;
  const lifecycleConnected =
    account.status === 'connected' ||
    (account.status === 'refreshing' && !lifecycleClaimIsStale(account.updatedAt));
  const status = authorizationExpired || !lifecycleConnected ? 'expired' : 'connected';
  return {
    platform: X_PLATFORM_ID,
    connected: status === 'connected',
    status,
    username: account.providerUsername || undefined,
    scopes: account.scopes.split(' ').filter(Boolean),
    expiresAt: account.expiresAt?.toISOString(),
    connectedAt: account.connectedAt.toISOString(),
  };
}

export async function getValidXAccessToken(userId: string): Promise<string> {
  const client = getClient();
  const account = await client.platformAccount.findUnique({
    where: { userId_platform: { userId, platform: X_PLATFORM_ID } },
  });
  if (!account) {
    throw new Error('X account is not connected');
  }
  if (account.status === 'refreshing') return waitForWinningRefresh(client, userId);
  if (account.status !== 'connected') throw new Error('X account is not connected');

  if (!account.expiresAt || account.expiresAt.getTime() > Date.now() + REFRESH_WINDOW_MS) {
    return decryptSecret(account.encryptedAccessToken, ACCESS_TOKEN_PURPOSE);
  }
  if (!account.encryptedRefreshToken) {
    const status =
      account.expiresAt && account.expiresAt.getTime() > Date.now()
        ? 'revocation_required'
        : 'expired';
    const update = await client.platformAccount.updateMany({
      where: {
        id: account.id,
        status: 'connected',
        encryptedAccessToken: account.encryptedAccessToken,
        encryptedRefreshToken: null,
        updatedAt: account.updatedAt,
      },
      data: { status },
    });
    if (update.count !== 1) {
      throw new Error('X account changed while authorization expiry was recorded');
    }
    throw new Error('X account authorization has expired; reconnect is required');
  }

  const currentRefreshToken = decryptSecret(account.encryptedRefreshToken, REFRESH_TOKEN_PURPOSE);
  const refreshGuard = {
    id: account.id,
    status: 'connected',
    encryptedRefreshToken: account.encryptedRefreshToken,
    updatedAt: account.updatedAt,
  };

  const claim = await client.platformAccount.updateMany({
    where: refreshGuard,
    data: { status: 'refreshing' },
  });
  if (claim.count !== 1) {
    return waitForWinningRefresh(client, userId);
  }

  let tokens: XTokenResponse;
  try {
    tokens = await refreshAccessToken(currentRefreshToken);
  } catch (error) {
    const accessTokenMayStillBeLive = Boolean(
      account.expiresAt && account.expiresAt.getTime() > Date.now()
    );
    const failureStatus = isDefinitiveXAuthorizationError(error)
      ? accessTokenMayStillBeLive
        ? 'revocation_required'
        : 'expired'
      : 'connected';
    await client.platformAccount.updateMany({
      where: {
        id: account.id,
        status: 'refreshing',
        encryptedRefreshToken: account.encryptedRefreshToken,
        connectedAt: account.connectedAt,
      },
      data: { status: failureStatus },
    });
    throw error;
  }

  const update = await client.platformAccount.updateMany({
    where: {
      id: account.id,
      status: 'refreshing',
      encryptedRefreshToken: account.encryptedRefreshToken,
      connectedAt: account.connectedAt,
    },
    data: {
      encryptedAccessToken: encryptSecret(tokens.access_token, ACCESS_TOKEN_PURPOSE),
      encryptedRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token, REFRESH_TOKEN_PURPOSE)
        : account.encryptedRefreshToken,
      tokenType: tokens.token_type.toLowerCase(),
      scopes: tokens.scope,
      expiresAt: tokenExpiry(tokens),
      refreshedAt: new Date(),
      status: 'connected',
    },
  });
  if (update.count !== 1) {
    await revokeXToken(tokens.refresh_token ?? tokens.access_token);
    throw new Error('X account changed while authorization was refreshing');
  }
  return tokens.access_token;
}

export async function disconnectXAccount(userId: string): Promise<boolean> {
  const client = getClient();
  const account = await client.platformAccount.findUnique({
    where: { userId_platform: { userId, platform: X_PLATFORM_ID } },
  });
  if (!account || account.status === 'revoked') return false;

  if (account.status === 'expired') {
    const update = await client.platformAccount.updateMany({
      where: {
        id: account.id,
        status: 'expired',
        encryptedAccessToken: account.encryptedAccessToken,
        encryptedRefreshToken: account.encryptedRefreshToken,
        updatedAt: account.updatedAt,
      },
      data: {
        encryptedAccessToken: '',
        encryptedRefreshToken: null,
        status: 'revoked',
        revokedAt: new Date(),
      },
    });
    return update.count === 1;
  }

  const activeClaim = ['refreshing', 'revoking', 'reconnecting'].includes(account.status);
  const recoveryRequired = account.status === 'recovery_required';
  const revocationRequired = account.status === 'revocation_required';
  if (activeClaim && !lifecycleClaimIsStale(account.updatedAt)) return false;
  if (account.status !== 'connected' && !activeClaim && !recoveryRequired && !revocationRequired)
    return false;

  const claim = await client.platformAccount.updateMany({
    where:
      account.status === 'connected'
        ? { id: account.id, status: 'connected', connectedAt: account.connectedAt }
        : { id: account.id, status: account.status, updatedAt: account.updatedAt },
    data: { status: 'revoking' },
  });
  if (claim.count !== 1) return false;

  const claimedAccount = await client.platformAccount.findUnique({ where: { id: account.id } });
  if (!claimedAccount || claimedAccount.status !== 'revoking') return false;

  const token = claimedAccount.encryptedRefreshToken
    ? decryptSecret(claimedAccount.encryptedRefreshToken, REFRESH_TOKEN_PURPOSE)
    : decryptSecret(claimedAccount.encryptedAccessToken, ACCESS_TOKEN_PURPOSE);
  try {
    await revokeXToken(token);
  } catch (error) {
    await client.platformAccount.updateMany({
      where: {
        id: claimedAccount.id,
        status: 'revoking',
        connectedAt: account.connectedAt,
        encryptedAccessToken: claimedAccount.encryptedAccessToken,
        encryptedRefreshToken: claimedAccount.encryptedRefreshToken,
      },
      data: {
        status: account.status === 'connected' ? 'connected' : 'recovery_required',
      },
    });
    throw error;
  }

  const update = await client.platformAccount.updateMany({
    where: {
      id: claimedAccount.id,
      status: 'revoking',
      connectedAt: account.connectedAt,
      encryptedAccessToken: claimedAccount.encryptedAccessToken,
      encryptedRefreshToken: claimedAccount.encryptedRefreshToken,
    },
    data: {
      encryptedAccessToken: '',
      encryptedRefreshToken: null,
      status: 'revoked',
      revokedAt: new Date(),
    },
  });
  return update.count === 1;
}
