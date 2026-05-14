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

/**
 * Required admin capabilities for the Gateon bot in a group/supergroup.
 * IDs must match `REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_IDS` in
 * `apps/web/src/lib/utils.ts`.
 *
 * Telegram mapping (ChatMemberAdministrator):
 * - send-messages      → can_manage_chat (includes sending in groups per Bot API)
 * - ban-users          → can_restrict_members
 * - manage-invite-links → can_invite_users
 */
export const REQUIRED_TELEGRAM_ADMIN_RIGHT_IDS = [
  'send-messages',
  'ban-users',
  'manage-invite-links',
] as const;

export type RequiredTelegramAdminRightId =
  (typeof REQUIRED_TELEGRAM_ADMIN_RIGHT_IDS)[number];

export type TelegramAdministratorRightsInput = {
  canManageChat: boolean;
  canRestrictMembers: boolean;
  canInviteUsers: boolean;
};

export function listMissingRequiredAdministratorRights(
  rights: TelegramAdministratorRightsInput,
): RequiredTelegramAdminRightId[] {
  const missing: RequiredTelegramAdminRightId[] = [];

  if (!rights.canManageChat) {
    missing.push('send-messages');
  }
  if (!rights.canRestrictMembers) {
    missing.push('ban-users');
  }
  if (!rights.canInviteUsers) {
    missing.push('manage-invite-links');
  }

  return missing;
}
