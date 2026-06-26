const DEFAULT_UPSTREAM_FETCH_TIMEOUT_MS = 30_000;

export function getUpstreamFetchTimeoutMs(): number {
  const raw = process.env.UPSTREAM_FETCH_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_UPSTREAM_FETCH_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_UPSTREAM_FETCH_TIMEOUT_MS;
}

export function isUpstreamFetchTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /timed?\s*out|aborted/i.test(error.message)
  );
}

export function upstreamFetchTimeoutMessage(): string {
  return "A API demorou para responder. Se o servidor estiver iniciando (cold start), aguarde alguns segundos e tente novamente.";
}

export function upstreamFetchFailedMessage(error: unknown): string {
  if (isUpstreamFetchTimeoutError(error)) {
    return upstreamFetchTimeoutMessage();
  }
  return "Serviço indisponível. Tente novamente.";
}
