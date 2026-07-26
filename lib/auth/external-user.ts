import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { Prisma, type PrismaClient } from '@prisma/client';

export interface ExternalUserInput {
  provider: string;
  externalId: string;
  email: string;
  name: string;
}

export interface ResolvedExternalUser {
  id: string;
  username: string;
  role: string;
  isNew: boolean;
}

export class ExternalIdentityEmailConflictError extends Error {
  constructor() {
    super('An account with this email already exists and must be linked explicitly');
    this.name = 'ExternalIdentityEmailConflictError';
  }
}

function identityKey(provider: string, externalId: string) {
  return { provider_externalId: { provider, externalId } };
}

function stableUsername(name: string, email: string, provider: string, externalId: string): string {
  const preferred = name.trim() || email.split('@')[0] || 'user';
  const base =
    preferred
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 16) || 'user';
  const suffix = createHash('sha256')
    .update(`${provider}\0${externalId}`)
    .digest('hex')
    .slice(0, 10);
  return `${base}-${suffix}`;
}

async function findIdentity(client: PrismaClient, provider: string, externalId: string) {
  return client.externalIdentity.findUnique({
    where: identityKey(provider, externalId),
    select: {
      user: { select: { id: true, username: true, role: true } },
    },
  });
}

async function findEmailOwner(client: PrismaClient, email: string) {
  return client.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
}

/** Resolve one provider subject to a durable local owner before signing a session. */
export async function resolveExternalUser(
  client: PrismaClient,
  input: ExternalUserInput
): Promise<ResolvedExternalUser> {
  const provider = input.provider.trim().toLowerCase();
  const externalId = input.externalId.trim();
  const email = input.email.trim().toLowerCase();
  if (!provider || !externalId || !email) {
    throw new Error('External identity is missing a provider, subject, or email');
  }

  const existing = await findIdentity(client, provider, externalId);
  if (existing) {
    return { ...existing.user, isNew: false };
  }

  // Linking solely by an email claim could attach an attacker-controlled
  // provider identity to a local password account. Require an explicit linking
  // flow instead.
  if (await findEmailOwner(client, email)) {
    throw new ExternalIdentityEmailConflictError();
  }

  const username = stableUsername(input.name, email, provider, externalId);
  const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);

  try {
    const created = await client.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: 'user',
        externalIdentities: { create: { provider, externalId } },
      },
      select: { id: true, username: true, role: true },
    });
    return { ...created, isNew: true };
  } catch (error) {
    // A concurrent callback for the same provider subject may win the unique
    // constraint. Resolve that durable winner rather than minting two owners.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await findIdentity(client, provider, externalId);
      if (winner) {
        return { ...winner.user, isNew: false };
      }
      if (await findEmailOwner(client, email)) {
        throw new ExternalIdentityEmailConflictError();
      }
    }
    throw error;
  }
}
