export function getServerApiBaseUrl(): string | null {
  const raw =
    process.env.API_URL?.trim() || process.env.INTERNAL_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}
