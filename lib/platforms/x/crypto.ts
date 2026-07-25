import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12;
const KEY_BYTES = 32;

function configuredEncryptionKey(): string | undefined {
  return (
    process.env.PLATFORM_TOKEN_ENCRYPTION_KEY ??
    process.env.CUSTOMCONNSTR_PLATFORM_TOKEN_ENCRYPTION_KEY
  );
}

function getEncryptionKey(): Buffer {
  const configured = configuredEncryptionKey();
  if (!configured) {
    throw new Error('PLATFORM_TOKEN_ENCRYPTION_KEY is not configured');
  }

  const key = Buffer.from(configured, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error('PLATFORM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return key;
}

export function isPlatformTokenEncryptionConfigured(): boolean {
  const configured = configuredEncryptionKey();
  return Boolean(configured && Buffer.from(configured, 'base64').length === KEY_BYTES);
}

export function encryptSecret(value: string, purpose: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(purpose, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptSecret(value: string, purpose: string): string {
  const [version, ivValue, tagValue, ciphertextValue, ...extra] = value.split('.');
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue || extra.length > 0) {
    throw new Error('Encrypted value has an unsupported format');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAAD(Buffer.from(purpose, 'utf8'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier, 'ascii').digest('base64url');
  return { verifier, challenge };
}

export function randomOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
