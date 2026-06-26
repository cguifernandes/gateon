export function readErrorBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    if (
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }

    if (
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
  }

  return fallback;
}

/** Alias for gradual migration from readApiError call sites */
export const readApiError = readErrorBody;

export function readUpstreamError(body: unknown): string {
  return readErrorBody(body, "Upstream request failed");
}
