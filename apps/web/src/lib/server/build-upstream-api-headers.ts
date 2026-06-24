type HeaderLike = {
  get(name: string): string | null;
};

function resolvePublicApiBaseUrl(): string | null {
  const raw =
    process.env.API_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.API_URL?.trim();

  return raw ? raw.replace(/\/$/, "") : null;
}

export function buildUpstreamApiHeaders(
  incoming?: HeaderLike,
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (incoming) {
    const forwardedFor =
      incoming.get("x-forwarded-for") ?? incoming.get("x-real-ip");
    if (forwardedFor) {
      headers["x-forwarded-for"] = forwardedFor;
    }

    const forwardedProto = incoming.get("x-forwarded-proto");
    if (forwardedProto) {
      headers["x-forwarded-proto"] = forwardedProto;
    }

    const forwardedHost = incoming.get("x-forwarded-host");
    if (forwardedHost) {
      headers["x-forwarded-host"] = forwardedHost;
    }
  }

  const publicApiBase = resolvePublicApiBaseUrl();
  if (publicApiBase) {
    headers["x-gateon-api-public-base-url"] = publicApiBase;
  }

  return headers;
}
