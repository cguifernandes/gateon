import * as Sentry from "@sentry/nextjs";

type ReportClientApiErrorInput = {
  route: string;
  method: string;
  status?: number;
  message: string;
  error?: unknown;
};

export function reportClientApiError(input: ReportClientApiErrorInput) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    return;
  }

  const context = {
    route: input.route,
    method: input.method,
    status: input.status,
    message: input.message,
  };

  if (input.error instanceof Error) {
    Sentry.captureException(input.error, {
      tags: {
        area: "client-api",
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
      area: "client-api",
      route: input.route,
      method: input.method,
      ...(input.status ? { status: String(input.status) } : {}),
    },
    extra: context,
  });
}

export async function fetchJsonWithSentry(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  routeLabel: string,
): Promise<Response> {
  const method = init?.method ?? "GET";

  try {
    const response = await fetch(input, init);
    if (!response.ok && response.status >= 500) {
      const cloned = response.clone();
      const body: unknown = await cloned.json().catch(() => null);
      const message =
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : `Request failed with status ${response.status}`;

      reportClientApiError({
        route: routeLabel,
        method,
        status: response.status,
        message,
      });
    }

    return response;
  } catch (error) {
    reportClientApiError({
      route: routeLabel,
      method,
      message: "Network request failed",
      error,
    });
    throw error;
  }
}
