export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

/** @deprecated Use `normalizeBaseUrl` */
export const normalizeWebBaseUrl = normalizeBaseUrl;
