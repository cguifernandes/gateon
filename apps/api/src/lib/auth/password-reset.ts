import { hashSensitiveValue } from '../../utils/utils';
import { normalizeBaseUrl } from '../url/normalize-base-url';

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 60;
const DEFAULT_PASSWORD_RESET_MAX_REQUESTS_PER_HOUR = 3;

export function getPasswordResetTtlMs(): number {
  const raw = process.env.PASSWORD_RESET_TTL_MINUTES;
  const minutes = raw ? Number(raw) : DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_PASSWORD_RESET_TTL_MINUTES * 60_000;
  }
  return minutes * 60_000;
}

export function getPasswordResetMaxRequestsPerHour(): number {
  const raw = process.env.PASSWORD_RESET_MAX_REQUESTS_PER_HOUR;
  const value = raw ? Number(raw) : DEFAULT_PASSWORD_RESET_MAX_REQUESTS_PER_HOUR;
  if (!Number.isInteger(value) || value <= 0) {
    return DEFAULT_PASSWORD_RESET_MAX_REQUESTS_PER_HOUR;
  }
  return value;
}

export function hashPasswordResetToken(token: string): string {
  return hashSensitiveValue(`password-reset:${token}`);
}

export function buildPasswordResetUrl(baseUrl: string, token: string): string {
  return `${normalizeBaseUrl(baseUrl)}/reset-password?token=${encodeURIComponent(token)}`;
}
