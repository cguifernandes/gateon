import type { IncomingHttpHeaders } from 'node:http';

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
