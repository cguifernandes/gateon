import { Logger } from '@nestjs/common';

export type EnvConfigEntry = {
  name: string;
  set: boolean;
  display: string;
};

const SENSITIVE_NAME_PATTERN =
  /(SECRET|PASSWORD|TOKEN|_KEY|ENCRYPTION|DSN|AUTH_TOKEN|CLIENT_SECRET|DATABASE_URL|DIRECT_URL)/i;

const API_ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'WEB_BASE_URL',
  'API_PUBLIC_BASE_URL',
  'API_URL',
  'COOKIE_DOMAIN',
  'DATABASE_URL',
  'DIRECT_URL',
  'SESSION_TTL_DAYS',
  'SESSION_METADATA_TTL_DAYS',
  'RATE_LIMIT_TTL_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'DATA_HASH_SECRET',
  'SECRET_ENCRYPTION_KEY',
  'STRIPE_CHECKOUT_PUBLIC_BASE_URL',
  'STRIPE_DEV_AUTO_RECONCILE_CHECKOUT',
  'STRIPE_WEBHOOK_SIGNING_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_OAUTH_DNS_IPV4_FIRST',
  'PASSWORD_RESET_TTL_MINUTES',
  'PASSWORD_RESET_MAX_REQUESTS_PER_HOUR',
  'PASSWORD_RESET_LOG_LINK_IN_DEV',
  'PASSWORD_RESET_FROM_EMAIL',
  'RESEND_API_KEY',
  'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_INTERNAL_SECRET',
  'TELEGRAM_GROUP_CONNECTION_TTL_MINUTES',
  'NODE_EXTRA_CA_CERTS',
  'ENABLE_ENV_DEBUG',
] as const;

function maskMiddle(value: string, visible = 4): string {
  if (value.length <= visible * 2) {
    return '*'.repeat(value.length);
  }
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function maskUrlWithCredentials(value: string): string {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = '***';
    }
    if (url.username) {
      url.username = maskMiddle(url.username, 2);
    }
    return url.toString();
  } catch {
    return maskMiddle(value);
  }
}

export function maskEnvValue(name: string, raw: string | undefined): string {
  if (!raw?.trim()) {
    return '(not set)';
  }

  const value = raw.trim();

  if (name === 'DATABASE_URL' || name === 'DIRECT_URL') {
    return maskUrlWithCredentials(value);
  }

  if (SENSITIVE_NAME_PATTERN.test(name)) {
    return maskMiddle(value);
  }

  return value;
}

export function isEnvDebugEnabled(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return true;
  }

  const flag = process.env.ENABLE_ENV_DEBUG?.trim().toLowerCase();
  return flag === 'true' || flag === '1';
}

export function buildEnvConfigSnapshot(
  keys: readonly string[] = API_ENV_KEYS,
): EnvConfigEntry[] {
  return keys.map((name) => {
    const raw = process.env[name];
    const set = Boolean(raw?.trim());

    return {
      name,
      set,
      display: maskEnvValue(name, raw),
    };
  });
}

export function logEnvConfigSnapshot(
  appName: string,
  keys: readonly string[] = API_ENV_KEYS,
): void {
  const logger = new Logger('EnvConfig');
  const entries = buildEnvConfigSnapshot(keys);
  const lines = entries.map(
    (entry) =>
      `  ${entry.name}=${entry.display}${entry.set ? '' : ' (missing)'}`,
  );

  logger.warn(
    `[${appName}] Environment snapshot (secrets masked):\n${lines.join('\n')}`,
  );
}

export function getApiEnvKeys(): readonly string[] {
  return API_ENV_KEYS;
}
