import { isLocalOnlyWebBaseUrl } from './stripe-checkout-redirect';

type HeaderReader = {
  get(name: string): string | null | undefined;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

function firstHeaderValue(value: string | null | undefined): string | null {
  const trimmed = value?.split(',')[0]?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function resolveRequestPublicBaseUrl(
  headers: HeaderReader,
): string | null {
  const fromGateonHeader = firstHeaderValue(
    headers.get('x-gateon-api-public-base-url'),
  );
  if (fromGateonHeader) {
    return normalizeBaseUrl(fromGateonHeader);
  }

  const forwardedHost = firstHeaderValue(headers.get('x-forwarded-host'));
  const forwardedProto = firstHeaderValue(headers.get('x-forwarded-proto'));
  if (forwardedHost && forwardedProto) {
    const candidate = normalizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
    if (!isLocalOnlyWebBaseUrl(candidate)) {
      return candidate;
    }
  }

  const host = firstHeaderValue(headers.get('host'));
  if (host && !isLocalOnlyWebBaseUrl(`http://${host}`)) {
    const proto = forwardedProto ?? 'https';
    return normalizeBaseUrl(`${proto}://${host}`);
  }

  return null;
}
