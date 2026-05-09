import type { Users } from "@prisma/client";

/** Cookie storing opaque session token (DB-backed session). */
export const SESSION_COOKIE_NAME = "gateon.session";

/** Short-lived cookie for OAuth CSRF `state` validation. */
export const OAUTH_STATE_COOKIE_NAME = "gateon.oauth.state";

/** Credentials provider id stored in `Accounts.providerId`. */
export const PROVIDER_CREDENTIALS = "credentials";

/** Google OAuth provider id. */
export const PROVIDER_GOOGLE = "google";

/** Default session lifetime when `SESSION_TTL_DAYS` is unset. */
export const DEFAULT_SESSION_TTL_DAYS = 7;

/** OAuth state cookie lifetime (ms). */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
};

export function toPublicUser(user: Users): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    image: user.image,
    createdAt: user.createdAt,
  };
}
