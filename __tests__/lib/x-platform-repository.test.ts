import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { decryptSecret, encryptSecret } from '../../lib/platforms/x/crypto';

const mockFindUnique = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpsert = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpdate = jest.fn<(args: unknown) => Promise<unknown>>();
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

  test('refreshes an expiring token and persists rotated credentials', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      expiresAt: new Date(Date.now() - 1),
      encryptedAccessToken: encryptSecret('old-access', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('old-refresh', 'x-refresh-token'),
    });
    mockRefreshAccessToken.mockResolvedValueOnce({
      token_type: 'bearer',
      expires_in: 7200,
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      scope: 'tweet.read tweet.write users.read offline.access',
    });
    mockUpdate.mockResolvedValueOnce({ id: 'account-1' });

    await expect(repository.getValidXAccessToken('user-1')).resolves.toBe('new-access');
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('old-refresh');

    const update = mockUpdate.mock.calls[0][0] as {
      data: { encryptedAccessToken: string; encryptedRefreshToken: string; status: string };
    };
    expect(decryptSecret(update.data.encryptedAccessToken, 'x-access-token')).toBe('new-access');
    expect(decryptSecret(update.data.encryptedRefreshToken, 'x-refresh-token')).toBe('new-refresh');
    expect(update.data.status).toBe('connected');
  });

  test('revokes at the provider before erasing stored credentials', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      encryptedAccessToken: encryptSecret('access-token', 'x-access-token'),
      encryptedRefreshToken: encryptSecret('refresh-token', 'x-refresh-token'),
    });
    mockRevokeXToken.mockResolvedValueOnce();
    mockUpdate.mockResolvedValueOnce({ id: 'account-1' });

    await expect(repository.disconnectXAccount('user-1')).resolves.toBe(true);
    expect(mockRevokeXToken).toHaveBeenCalledWith('refresh-token');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          encryptedAccessToken: '',
          encryptedRefreshToken: null,
          status: 'revoked',
        }),
      })
    );
  });

  test('keeps credentials when provider revocation fails', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'account-1',
      status: 'connected',
      encryptedAccessToken: encryptSecret('access-token', 'x-access-token'),
      encryptedRefreshToken: null,
    });
    mockRevokeXToken.mockRejectedValueOnce(new Error('provider unavailable'));

    await expect(repository.disconnectXAccount('user-1')).rejects.toThrow('provider unavailable');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
