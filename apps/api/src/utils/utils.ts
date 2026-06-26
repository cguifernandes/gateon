import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import type { Users } from '@prisma/client';
import type { PlanId } from '../lib/zod/plan-schemas';

/** Cookie storing opaque session token (DB-backed session). */
export const SESSION_COOKIE_NAME = 'gateon.session';

/** Short-lived cookie for OAuth CSRF `state` validation. */
export const OAUTH_STATE_COOKIE_NAME = 'gateon.oauth.state';

/** Credentials provider id stored in `Accounts.providerId`. */
export const PROVIDER_CREDENTIALS = 'credentials';

/** Google OAuth provider id. */
export const PROVIDER_GOOGLE = 'google';

/** Default session lifetime when `SESSION_TTL_DAYS` is unset. */
export const DEFAULT_SESSION_TTL_DAYS = 7;

/** OAuth state cookie lifetime (ms). */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  planId: PlanId;
};

export function toPublicUser(user: Users): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
    planId: user.planId as PlanId,
  };
}

function getDataHashSecret(): string {
  const secret = process.env.DATA_HASH_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATA_HASH_SECRET is required in production');
    }
    return 'dev-only-data-hash-secret';
  }
  return secret;
}

export function hashSensitiveValue(value: string): string {
  return createHmac('sha256', getDataHashSecret()).update(value).digest('hex');
}

function getEncryptionKey(): Buffer {
  const secret = process.env.SECRET_ENCRYPTION_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECRET_ENCRYPTION_KEY is required in production');
    }
    return createHmac('sha256', 'dev-only-secret-encryption-key')
      .update('gateon-dev-secret-encryption-key')
      .digest();
  }

  if (/^[a-f0-9]{64}$/i.test(secret)) {
    return Buffer.from(secret, 'hex');
  }

  return createHmac('sha256', secret)
    .update('gateon-secret-encryption')
    .digest();
}

export function encryptSecretValue(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSecretValue(value: string): string {
  const [version, iv, tag, encrypted] = value.split(':');
  if (version !== 'v1' || !iv || !tag || !encrypted) {
    throw new Error('Invalid encrypted secret format');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
