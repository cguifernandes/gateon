import * as Sentry from "@sentry/nextjs";
import { getSentryClientOptions } from "@/lib/sentry/sentry-options";

Sentry.init(getSentryClientOptions());

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
