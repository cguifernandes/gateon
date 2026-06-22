import * as Sentry from "@sentry/nextjs";
import { getSentryEdgeOptions } from "./src/lib/sentry/sentry-options";

Sentry.init(getSentryEdgeOptions());
