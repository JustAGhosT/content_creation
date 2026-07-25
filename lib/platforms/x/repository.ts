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

export async function saveXAccount(
  userId: string,
  identity: { id: string; username: string },
  tokens: XTokenResponse
) {
  return getClient().platformAccount.upsert({
    where: { userId_platform: { userId, platform: X_PLATFORM_ID } },
    create: {
      userId,
      platform: X_PLATFORM_ID,
      providerAccountId: identity.id,
      providerUsername: identity.username,
      encryptedAccessToken: encryptSecret(tokens.access_token, ACCESS_TOKEN_PURPOSE),
      encryptedRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token, REFRESH_TOKEN_PURPOSE)
        : null,
      tokenType: tokens.token_type.toLowerCase(),
      scopes: tokens.scope,
      expiresAt: tokenExpiry(tokens),
      status: 'connected',
    },
    update: {
      providerAccountId: identity.id,
      providerUsername: identity.username,
      encryptedAccessToken: encryptSecret(tokens.access_token, ACCESS_TOKEN_PURPOSE),
      encryptedRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token, REFRESH_TOKEN_PURPOSE)
        : null,
      tokenType: tokens.token_type.toLowerCase(),
      scopes: tokens.scope,
      expiresAt: tokenExpiry(tokens),
      status: 'connected',
      connectedAt: new Date(),
      refreshedAt: null,
      revokedAt: null,
    },
  });
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
    },
  });

  if (!account || account.status === 'revoked') {
    return { platform: X_PLATFORM_ID, connected: false, status: 'revoked', scopes: [] };
  }

  const accessTokenExpired = Boolean(
    account.expiresAt && account.expiresAt.getTime() <= Date.now()
  );
  const authorizationExpired = accessTokenExpired && !account.encryptedRefreshToken;
  const status = authorizationExpired || account.status !== 'connected' ? 'expired' : 'connected';
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
  if (!account || account.status !== 'connected') {
    throw new Error('X account is not connected');
  }

  if (!account.expiresAt || account.expiresAt.getTime() > Date.now() + REFRESH_WINDOW_MS) {
    return decryptSecret(account.encryptedAccessToken, ACCESS_TOKEN_PURPOSE);
  }
  if (!account.encryptedRefreshToken) {
    await client.platformAccount.update({
      where: { id: account.id },
      data: { status: 'expired' },
    });
    throw new Error('X account authorization has expired; reconnect is required');
  }

  const currentRefreshToken = decryptSecret(account.encryptedRefreshToken, REFRESH_TOKEN_PURPOSE);
  const refreshGuard = {
    id: account.id,
    status: 'connected',
    encryptedRefreshToken: account.encryptedRefreshToken,
    updatedAt: account.updatedAt,
  };
  try {
    const tokens = await refreshAccessToken(currentRefreshToken);
    const update = await client.platformAccount.updateMany({
      where: refreshGuard,
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
      throw new Error('X account changed while authorization was refreshing');
    }
    return tokens.access_token;
  } catch (error) {
    if (isDefinitiveXAuthorizationError(error)) {
      await client.platformAccount.updateMany({
        where: refreshGuard,
        data: { status: 'expired' },
      });
    }
    throw error;
  }
}

export async function disconnectXAccount(userId: string): Promise<boolean> {
  const client = getClient();
  const account = await client.platformAccount.findUnique({
    where: { userId_platform: { userId, platform: X_PLATFORM_ID } },
  });
  if (!account || account.status === 'revoked') return false;

  const token = account.encryptedRefreshToken
    ? decryptSecret(account.encryptedRefreshToken, REFRESH_TOKEN_PURPOSE)
    : decryptSecret(account.encryptedAccessToken, ACCESS_TOKEN_PURPOSE);
  await revokeXToken(token);

  await client.platformAccount.update({
    where: { id: account.id },
    data: {
      encryptedAccessToken: '',
      encryptedRefreshToken: null,
      status: 'revoked',
      revokedAt: new Date(),
    },
  });
  return true;
}
