import { type NextRequest, NextResponse } from "next/server";
import { buildUpstreamApiHeaders } from "@/lib/server/build-upstream-api-headers";
import { reportBffError } from "@/lib/sentry/report-bff-error";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import { readUpstreamError } from "./read-upstream-error";

const DEFAULT_TIMEOUT_MS = 30_000;

export function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

type ProxyAuthenticatedJsonApiInput = {
  request: NextRequest;
  upstreamPath: string;
  routeLabel: string;
  init?: RequestInit;
  timeoutMs?: number;
  search?: string;
};

export async function proxyAuthenticatedJsonApi({
  request,
  upstreamPath,
  routeLabel,
  init,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  search = "",
}: ProxyAuthenticatedJsonApiInput) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return unauthorizedResponse();
  }

  const base = getServerApiBaseUrl();
  if (!base) {
    reportBffError({
      route: routeLabel,
      method: init?.method ?? request.method,
      upstreamPath,
      message: "Upstream API not configured",
    });
    return NextResponse.json(
      { error: "Upstream API not configured" },
      { status: 503 },
    );
  }

  const upstreamHeaders = buildUpstreamApiHeaders(request.headers);

  let upstream: Response;
  try {
    upstream = await fetch(`${base}${upstreamPath}${search}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...upstreamHeaders,
        ...init?.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    reportBffError({
      route: routeLabel,
      method: init?.method ?? request.method,
      upstreamPath,
      message: "Upstream request failed",
      error,
    });
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 503 },
    );
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return unauthorizedResponse();
  }

  const raw: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    reportBffError({
      route: routeLabel,
      method: init?.method ?? request.method,
      upstreamPath,
      status: upstream.status,
      message: readUpstreamError(raw),
    });
    return NextResponse.json(
      { error: readUpstreamError(raw) },
      { status: upstream.status >= 400 ? upstream.status : 502 },
    );
  }

  return NextResponse.json(raw);
}
