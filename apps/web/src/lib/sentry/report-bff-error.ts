import * as Sentry from "@sentry/nextjs";

type ReportBffErrorInput = {
  route: string;
  method: string;
  upstreamPath: string;
  status?: number;
  message: string;
  error?: unknown;
  area?: "bff" | "server-action";
};

export function reportBffError(input: ReportBffErrorInput) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    return;
  }

  const context = {
    route: input.route,
    method: input.method,
    upstreamPath: input.upstreamPath,
    status: input.status,
    message: input.message,
  };

  const area = input.area ?? "bff";

  if (input.error instanceof Error) {
    Sentry.captureException(input.error, {
      tags: {
        area,
        route: input.route,
        method: input.method,
      },
      extra: context,
    });
    return;
  }

  Sentry.captureMessage(input.message, {
    level: "error",
    tags: {
      area,
      route: input.route,
      method: input.method,
      ...(input.status ? { upstream_status: String(input.status) } : {}),
    },
    extra: context,
  });
}
