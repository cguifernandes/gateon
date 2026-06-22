import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

function resolveSampleRate(
  envName: string,
  productionDefault: number,
  developmentDefault: number,
): number {
  const raw = process.env[envName]?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }

  return process.env.NODE_ENV === "production"
    ? productionDefault
    : developmentDefault;
}

function getBaseOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

  return {
    dsn,
    enabled: Boolean(dsn),
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV ||
      "development",
    tracesSampleRate: resolveSampleRate(
      "NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE",
      0.1,
      1,
    ),
    sendDefaultPii: false,
  };
}

export function getSentryServerOptions(): NodeOptions {
  return {
    ...getBaseOptions(),
    integrations: (integrations) => integrations,
  };
}

export function getSentryEdgeOptions(): EdgeOptions {
  return getSentryServerOptions();
}

export function getSentryClientOptions(): BrowserOptions {
  return {
    ...getBaseOptions(),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: resolveSampleRate(
      "NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE",
      0,
      0,
    ),
  };
}
