import * as Sentry from "@sentry/nextjs";
import { getSentryServerOptions } from "./src/lib/sentry/sentry-options";

Sentry.init(getSentryServerOptions());
