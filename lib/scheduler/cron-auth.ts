import crypto from 'node:crypto';

const KEY_VAULT_RESOURCE = 'https://vault.azure.net';
const MANAGED_IDENTITY_API_VERSION = '2019-08-01';
const KEY_VAULT_API_VERSION = '7.4';
const SECRET_LOOKUP_TIMEOUT_MS = 5_000;
const SECRET_CACHE_TTL_MS = 5 * 60_000;
const SECRET_NEGATIVE_CACHE_TTL_MS = 30_000;

let secretCache:
  | { configurationKey: string; value: string | undefined; expiresAt: number }
  | undefined;

async function fetchWithTimeout(input: URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SECRET_LOOKUP_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function getEnvironmentCronSecret(): string | undefined {
  return (
    process.env.CRON_SECRET?.trim() || process.env.CUSTOMCONNSTR_CRON_SECRET?.trim() || undefined
  );
}

function getSecretConfigurationKey(): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        process.env.IDENTITY_ENDPOINT ?? '',
        process.env.IDENTITY_HEADER ?? '',
        process.env.SCHEDULER_CRON_SECRET_URI ?? '',
        process.env.CRON_SECRET ?? '',
        process.env.CUSTOMCONNSTR_CRON_SECRET ?? '',
      ])
    )
    .digest('hex');
}

async function getManagedIdentityCronSecret(): Promise<string | undefined> {
  const identityEndpoint = process.env.IDENTITY_ENDPOINT?.trim();
  const identityHeader = process.env.IDENTITY_HEADER?.trim();
  const secretUri = process.env.SCHEDULER_CRON_SECRET_URI?.trim();

  if (!identityEndpoint || !identityHeader || !secretUri) return undefined;

  try {
    const tokenUrl = new URL(identityEndpoint);
    tokenUrl.searchParams.set('resource', KEY_VAULT_RESOURCE);
    tokenUrl.searchParams.set('api-version', MANAGED_IDENTITY_API_VERSION);

    const tokenResponse = await fetchWithTimeout(tokenUrl, {
      headers: { 'X-IDENTITY-HEADER': identityHeader },
    });
    if (!tokenResponse.ok) return undefined;

    const tokenBody = (await tokenResponse.json()) as { access_token?: unknown };
    if (typeof tokenBody.access_token !== 'string' || !tokenBody.access_token) return undefined;

    const keyVaultUrl = new URL(secretUri);
    keyVaultUrl.searchParams.set('api-version', KEY_VAULT_API_VERSION);

    const secretResponse = await fetchWithTimeout(keyVaultUrl, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    if (!secretResponse.ok) return undefined;

    const secretBody = (await secretResponse.json()) as { value?: unknown };
    return typeof secretBody.value === 'string' ? secretBody.value.trim() || undefined : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the scheduler secret directly from Key Vault when managed identity
 * is available. Environment configuration remains a fail-safe for local and
 * transitional deployments.
 */
export async function getSchedulerCronSecret(): Promise<string | undefined> {
  const configurationKey = getSecretConfigurationKey();
  const now = Date.now();

  if (secretCache?.configurationKey === configurationKey && secretCache.expiresAt > now) {
    return secretCache.value;
  }

  const value = (await getManagedIdentityCronSecret()) ?? getEnvironmentCronSecret();
  secretCache = {
    configurationKey,
    value,
    expiresAt: now + (value ? SECRET_CACHE_TTL_MS : SECRET_NEGATIVE_CACHE_TTL_MS),
  };

  return value;
}

export function hasSchedulerCronCredential(request: Request): boolean {
  const directSecret = request.headers.get('x-omnipost-cron-secret');
  const authorization = request.headers.get('authorization');

  return Boolean(
    directSecret?.trim() ||
    (authorization?.startsWith('Bearer ') && authorization.slice('Bearer '.length).trim())
  );
}

/**
 * Authenticate scheduler requests through a dedicated header, while retaining
 * Bearer compatibility for existing callers.
 */
export function isSchedulerCronRequestAuthorized(request: Request, cronSecret: string): boolean {
  const directSecret = request.headers.get('x-omnipost-cron-secret');
  const authorization = request.headers.get('authorization');
  const candidate =
    directSecret ?? (authorization?.startsWith('Bearer ') ? authorization.slice(7) : '');

  const expectedBuffer = Buffer.from(cronSecret);
  const candidateBuffer = Buffer.from(candidate);

  return (
    expectedBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, candidateBuffer)
  );
}

export function getSchedulerCronAuthDiagnostics(request: Request, cronSecret: string) {
  const directSecret = request.headers.get('x-omnipost-cron-secret');
  const authorization = request.headers.get('authorization');

  return {
    expectedBytes: Buffer.byteLength(cronSecret),
    directHeaderPresent: directSecret !== null,
    directHeaderBytes: Buffer.byteLength(directSecret ?? ''),
    authorizationHeaderPresent: authorization !== null,
    authorizationHeaderBytes: Buffer.byteLength(authorization ?? ''),
  };
}
