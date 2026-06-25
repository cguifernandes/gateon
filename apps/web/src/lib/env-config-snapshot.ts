export type EnvConfigEntry = {
  name: string;
  set: boolean;
  display: string;
};

const SENSITIVE_NAME_PATTERN =
  /(SECRET|PASSWORD|TOKEN|_KEY|ENCRYPTION|DSN|AUTH_TOKEN|CLIENT_SECRET|DATABASE_URL)/i;

const WEB_ENV_KEYS = [
  "NODE_ENV",
  "VERCEL_ENV",
  "INTERNAL_API_URL",
  "API_URL",
  "API_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_ENVIRONMENT",
  "NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE",
  "NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_AUTH_TOKEN",
  "UPSTREAM_FETCH_TIMEOUT_MS",
  "ENABLE_ENV_DEBUG",
] as const;

function maskMiddle(value: string, visible = 4): string {
  if (value.length <= visible * 2) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function maskUrlWithCredentials(value: string): string {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = "***";
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
    return "(not set)";
  }

  const value = raw.trim();

  if (SENSITIVE_NAME_PATTERN.test(name)) {
    if (name.includes("DSN") && value.includes("@")) {
      return maskUrlWithCredentials(value.replace(/^https?:\/\//, "https://"));
    }
    return maskMiddle(value);
  }

  return value;
}

export function isEnvDebugEnabled(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === "development" || nodeEnv === "test") {
    return true;
  }

  const flag = process.env.ENABLE_ENV_DEBUG?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export function buildEnvConfigSnapshot(
  keys: readonly string[] = WEB_ENV_KEYS,
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
  keys: readonly string[] = WEB_ENV_KEYS,
): void {
  const entries = buildEnvConfigSnapshot(keys);
  const lines = entries.map(
    (entry) =>
      `  ${entry.name}=${entry.display}${entry.set ? "" : " (missing)"}`,
  );

  console.warn(
    `[${appName}] Environment snapshot (secrets masked):\n${lines.join("\n")}`,
  );
}

export function getWebEnvKeys(): readonly string[] {
  return WEB_ENV_KEYS;
}
