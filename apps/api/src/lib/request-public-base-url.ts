import type { IncomingHttpHeaders } from 'node:http';
import { readRequestHeader } from './http-header-reader';
import { isLocalOnlyWebBaseUrl } from './stripe-checkout-redirect';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

function firstHeaderValue(value: string | undefined): string | null {
  const trimmed = value?.split(',')[0]?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function resolveRequestPublicBaseUrl(
  headers: IncomingHttpHeaders,
): string | null {
  const fromGateonHeader = firstHeaderValue(
    readRequestHeader(headers, 'x-gateon-api-public-base-url'),
  );
  if (fromGateonHeader) {
    return normalizeBaseUrl(fromGateonHeader);
  }

  const forwardedHost = firstHeaderValue(
    readRequestHeader(headers, 'x-forwarded-host'),
  );
  const forwardedProto = firstHeaderValue(
    readRequestHeader(headers, 'x-forwarded-proto'),
  );
  if (forwardedHost && forwardedProto) {
    const candidate = normalizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
    if (!isLocalOnlyWebBaseUrl(candidate)) {
      return candidate;
    }
  }

  const host = firstHeaderValue(readRequestHeader(headers, 'host'));
  if (host && !isLocalOnlyWebBaseUrl(`http://${host}`)) {
    const proto = forwardedProto ?? 'https';
    return normalizeBaseUrl(`${proto}://${host}`);
  }

  return null;
}
