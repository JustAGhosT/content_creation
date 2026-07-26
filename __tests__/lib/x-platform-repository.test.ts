import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { decryptSecret, encryptSecret } from '../../lib/platforms/x/crypto';
import { XOAuthTokenRequestError } from '../../lib/platforms/x/oauth';

const mockFindUnique = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpsert = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpdate = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpdateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>();
const mockRefreshAccessToken = jest.fn<(token: string) => Promise<unknown>>();
const mockRevokeXToken = jest.fn<(token: string) => Promise<void>>();

const originalEnvironment = { ...process.env };
let repository: typeof import('../../lib/platforms/x/repository');

describe('X platform account repository', () => {
  beforeAll(async () => {
    jest.doMock('@/lib/db/prisma', () => ({
      __esModule: true,
      default: {
        platformAccount: {
          findUnique: mockFindUnique,
          upsert: mockUpsert,
          update: mockUpdate,
          updateMany: mockUpdateMany,
        },
      },
    }));
    jest.doMock('../../lib/platforms/x/oauth', () => {
      const actual = jest.requireActual('../../lib/platforms/x/oauth') as Record<string, unknown>;
      return {
        ...actual,
        refreshAccessToken: mockRefreshAccessToken,
        revokeXToken: mockRevokeXToken,
      };
    });
    repository = await import('../../lib/platforms/x/repository');
  });

  beforeEach(() => {
    process.env.PLATFORM_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
    mockFindUnique.mockReset();
    mockUpsert.mockReset();
    mockUpdate.mockReset();
    mockUpdateMany.mockReset();
    mockRefreshAccessToken.mockReset();
    mockRevokeXToken.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  test('encrypts access and refresh tokens before persistence', async () => {
    mockUpsert.mockResolvedValueOnce({ id: 'account-1' });

    await repository.saveXAccount(
      'user-1',
      { id: 'x-1', username: 'omnipost' },
      {
        token_type: 'bearer',
        expires_in: 7200,
        access_token: 'plain-access-token',
        refresh_token: 'plain-refresh-token',
        scope: 'tweet.read tweet.write users.read offline.access',
      }
    );

    const call = mockUpsert.mock.calls[0][0] as {
      create: { encryptedAccessToken: string; encryptedRefreshToken: string };
    };
    expect(call.create.encryptedAccessToken).not.toContain('plain-access-token');
    expect(call.create.encryptedRefreshToken).not.toContain('plain-refresh-token');
    expect(decryptSecret(call.create.encryptedAccessToken, 'x-access-token')).toBe(
      'plain-access-token'
    );
    expect(decryptSecret(call.create.encryptedRefreshToken, 'x-refresh-token')).toBe(
      'plain-refresh-token'
    );
  });

  test('uses a forward-only tenant-owned platform account migration', () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260725173500_platform_account_oauth',
        'migration.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE TABLE "PlatformAccount"');
    expect(migration).toContain('PlatformAccount_userId_platform_key');
    expect(migration).toContain('REFERENCES "User"("id")');
    expect(migration).not.toContain('DROP TABLE');
  });

  test('reports expired accounts without returning token material', async () => {
    mockFindUnique.mockResolvedValueOnce({
      providerUsername: 'omnipost',
      scopes: 'tweet.read tweet.write',
      expiresAt: new Date(Date.now() - 60_000),
      encryptedRefreshToken: null,
      status: 'connected',
      connectedAt: new Date('2026-07-25T12:00:00Z'),
    });

    await expect(repository.getXConnectionStatus('user-1')).resolves.toEqual({
      platform: 'twitter',
      connected: false,
      status: 'expired',
      username: 'omnipost',
      scopes: ['tweet.read', 'tweet.write'],
      expiresAt: expect.any(String),
      connectedAt: '2026-07-25T12:00:00.000Z',
    });
  });

  test('reports an account as connected when an expired access token can be refreshed', async () => {
    mockFindUnique.mockResolvedValueOnce({
      providerUsername: 'omnipost',
      scopes: 'tweet.read tweet.write offline.access',
      expiresAt: new Date(Date.now() - 60_000),
      encryptedRefreshToken: encryptSecret('refresh-token', 'x-refresh-token'),
      status: 'connected',
      connectedAt: new Date('2026-07-25T12:00:00Z'),
    });

    await expect(repository.getXConnectionStatus('user-1')).resolves.toEqual(
      expect.objectContaining({
        connected: true,
        status: 'connected',
      })
    );
  });

  test('does not expire a newly reconnected account from a stale no-refresh read', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      expiresAt: new Date(Date.now() - 1),
      encryptedAccessToken: encryptSecret('old-access', 'x-access-token'),
      encryptedRefreshToken: null,
      updatedAt: new Date('2026-07-25T12:00:00Z'),
    });
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(repository.getValidXAccessToken('user-1')).rejects.toThrow(
      'X account changed while authorization expiry was recorded'
    );
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'account-1',
        status: 'connected',
        encryptedRefreshToken: null,
        updatedAt: new Date('2026-07-25T12:00:00Z'),
      }),
      data: { status: 'expired' },
    });
  });

  test('refreshes an expiring token and persists rotated credentials', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      expiresAt: new Date(Date.now() - 1),
      encryptedAccessToken: encryptSecret('old-access', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('old-refresh', 'x-refresh-token'),
      updatedAt: new Date('2026-07-25T12:00:00Z'),
    });
    mockRefreshAccessToken.mockResolvedValueOnce({
      token_type: 'bearer',
      expires_in: 7200,
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      scope: 'tweet.read tweet.write users.read offline.access',
    });
    mockUpdateMany.mockResolvedValueOnce({ count: 1 });

    await expect(repository.getValidXAccessToken('user-1')).resolves.toBe('new-access');
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('old-refresh');

    const update = mockUpdateMany.mock.calls[0][0] as {
      data: { encryptedAccessToken: string; encryptedRefreshToken: string; status: string };
    };
    expect(decryptSecret(update.data.encryptedAccessToken, 'x-access-token')).toBe('new-access');
    expect(decryptSecret(update.data.encryptedRefreshToken, 'x-refresh-token')).toBe('new-refresh');
    expect(update.data.status).toBe('connected');
  });

  test('keeps an account connected after a transient refresh failure', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      expiresAt: new Date(Date.now() - 1),
      encryptedAccessToken: encryptSecret('old-access', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('old-refresh', 'x-refresh-token'),
      updatedAt: new Date('2026-07-25T12:00:00Z'),
    });
    mockRefreshAccessToken.mockRejectedValueOnce(
      new XOAuthTokenRequestError(429, 'temporarily_unavailable')
    );

    await expect(repository.getValidXAccessToken('user-1')).rejects.toThrow(
      'X OAuth token request failed with status 429'
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('expires an account after a definitive refresh-token rejection', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      expiresAt: new Date(Date.now() - 1),
      encryptedAccessToken: encryptSecret('old-access', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('old-refresh', 'x-refresh-token'),
      updatedAt: new Date('2026-07-25T12:00:00Z'),
    });
    mockRefreshAccessToken.mockRejectedValueOnce(new XOAuthTokenRequestError(400, 'invalid_grant'));
    mockUpdateMany.mockResolvedValueOnce({ count: 1 });

    await expect(repository.getValidXAccessToken('user-1')).rejects.toThrow(
      'X OAuth token request failed with status 400'
    );
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'account-1', status: 'connected' }),
      data: { status: 'expired' },
    });
  });

  test('does not overwrite a concurrent disconnect or reconnect after refresh', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      expiresAt: new Date(Date.now() - 1),
      encryptedAccessToken: encryptSecret('old-access', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('old-refresh', 'x-refresh-token'),
      updatedAt: new Date('2026-07-25T12:00:00Z'),
    });
    mockRefreshAccessToken.mockResolvedValueOnce({
      token_type: 'bearer',
      expires_in: 7200,
      access_token: 'stale-refreshed-access',
      refresh_token: 'stale-refreshed-refresh',
      scope: 'tweet.read tweet.write users.read offline.access',
    });
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(repository.getValidXAccessToken('user-1')).rejects.toThrow(
      'X account changed while authorization was refreshing'
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'account-1',
          status: 'connected',
          updatedAt: new Date('2026-07-25T12:00:00Z'),
        }),
      })
    );
  });

  test('revokes at the provider before erasing stored credentials', async () => {
    const account = {
      id: 'account-1',
      status: 'connected',
      encryptedAccessToken: encryptSecret('access-token', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('refresh-token', 'x-refresh-token'),
      connectedAt: new Date('2026-07-25T11:00:00Z'),
      updatedAt: new Date('2026-07-25T12:00:00Z'),
    };
    mockFindUnique
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce({ ...account, status: 'revoking' });
    mockRevokeXToken.mockResolvedValueOnce();
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });

    await expect(repository.disconnectXAccount('user-1')).resolves.toBe(true);
    expect(mockRevokeXToken).toHaveBeenCalledWith('refresh-token');
    expect(mockUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'account-1',
        status: 'connected',
        connectedAt: new Date('2026-07-25T11:00:00Z'),
      },
      data: { status: 'revoking' },
    });
    expect(mockUpdateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ status: 'revoking' }),
        data: expect.objectContaining({ status: 'revoked' }),
      })
    );
  });

  test('keeps credentials when provider revocation fails', async () => {
    const account = {
      id: 'account-1',
      status: 'connected',
      encryptedAccessToken: encryptSecret('access-token', 'x-access-token'),
      encryptedRefreshToken: null,
      connectedAt: new Date('2026-07-25T11:00:00Z'),
    };
    mockFindUnique
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce({ ...account, status: 'revoking' });
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    mockRevokeXToken.mockRejectedValueOnce(new Error('provider unavailable'));

    await expect(repository.disconnectXAccount('user-1')).rejects.toThrow('provider unavailable');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { status: 'connected' } })
    );
  });

  test('does not erase credentials from a concurrent reconnect after provider revocation', async () => {
    const encryptedAccessToken = encryptSecret('old-access', 'x-access-token');
    const encryptedRefreshToken = encryptSecret('old-refresh', 'x-refresh-token');
    const account = {
      id: 'account-1',
      status: 'connected',
      encryptedAccessToken,
      encryptedRefreshToken,
      connectedAt: new Date('2026-07-25T11:00:00Z'),
      updatedAt: new Date('2026-07-25T12:00:00Z'),
    };
    mockFindUnique
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce({ ...account, status: 'revoking' });
    mockRevokeXToken.mockResolvedValueOnce();
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await expect(repository.disconnectXAccount('user-1')).resolves.toBe(false);
    expect(mockUpdateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'revoking', connectedAt: account.connectedAt }),
      })
    );
  });

  test('disconnect revokes credentials rotated by an in-flight refresh before the claim', async () => {
    const connectedAt = new Date('2026-07-25T11:00:00Z');
    const initialAccount = {
      id: 'account-1',
      status: 'connected',
      encryptedAccessToken: encryptSecret('old-access', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('old-refresh', 'x-refresh-token'),
      connectedAt,
    };
    const claimedAccount = {
      ...initialAccount,
      status: 'revoking',
      encryptedAccessToken: encryptSecret('rotated-access', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('rotated-refresh', 'x-refresh-token'),
    };
    mockFindUnique.mockResolvedValueOnce(initialAccount).mockResolvedValueOnce(claimedAccount);
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    mockRevokeXToken.mockResolvedValueOnce();

    await expect(repository.disconnectXAccount('user-1')).resolves.toBe(true);
    expect(mockRevokeXToken).toHaveBeenCalledWith('rotated-refresh');
    expect(mockUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'account-1', status: 'connected', connectedAt },
      data: { status: 'revoking' },
    });
  });
});
