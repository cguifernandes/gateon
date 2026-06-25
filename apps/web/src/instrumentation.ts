import * as Sentry from "@sentry/nextjs";
import {
  isEnvDebugEnabled,
  logEnvConfigSnapshot,
} from "@/lib/env-config-snapshot";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    if (isEnvDebugEnabled()) {
      logEnvConfigSnapshot("web");
      console.warn("[web] Env debug page: /debug/env");
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
