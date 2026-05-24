import { createHmac } from 'node:crypto';
import type { Users } from '@prisma/client';

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
};

export function toPublicUser(user: Users): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
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

export {
  getTelegramAdminRightTitle,
  listMissingRequiredAdministratorRights,
  noTelegramGroupAdministratorRights,
  parseTelegramGroupAdministratorRights,
  parseTelegramGroupAdministratorRightsPayload,
  REQUIRED_TELEGRAM_GROUP_ADMIN_RIGHT_IDS,
  type RequiredTelegramGroupAdminRightId,
  type TelegramGroupAdministratorRights,
} from '../lib/telegram-admin-rights';

/** @deprecated Use `TelegramGroupAdministratorRights` */
export type TelegramAdministratorRightsInput =
  import('../lib/telegram-admin-rights').TelegramGroupAdministratorRights;
