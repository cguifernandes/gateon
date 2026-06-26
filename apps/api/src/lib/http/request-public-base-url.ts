import type { IncomingHttpHeaders } from 'node:http';
import { isLocalOnlyWebBaseUrl } from '../stripe/checkout-redirect';
import { normalizeBaseUrl } from '../url/normalize-base-url';

export type RequestHeadersInput = IncomingHttpHeaders;

export function readRequestHeader(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const normalized = name.toLowerCase();
  const value = headers[normalized] ?? headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
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
