import { type NextRequest, NextResponse } from "next/server";
import { reportBffError } from "@/lib/sentry/report-bff-error";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";

const ROUTE_LABEL = "/api/auth/session";
const UPSTREAM_PATH = "/auth/me";
const VALIDATION_TIMEOUT_MS = 10_000;

function unauthorizedResponse() {
  const response = NextResponse.json({ ok: false }, { status: 401 });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return unauthorizedResponse();
  }

  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  try {
    const response = await fetch(`${base}${UPSTREAM_PATH}`, {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
    });

    if (response.ok) {
      return NextResponse.json({ ok: true });
    }

    if (response.status === 401 || response.status === 403) {
      return unauthorizedResponse();
    }

    reportBffError({
      route: ROUTE_LABEL,
      method: "GET",
      upstreamPath: UPSTREAM_PATH,
      status: response.status,
      message: "Session validation failed",
    });
    return NextResponse.json({ ok: false }, { status: 503 });
  } catch (error) {
    reportBffError({
      route: ROUTE_LABEL,
      method: "GET",
      upstreamPath: UPSTREAM_PATH,
      message: "Session validation failed",
      error,
    });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
