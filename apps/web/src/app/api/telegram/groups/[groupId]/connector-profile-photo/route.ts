import { type NextRequest, NextResponse } from "next/server";
import { reportBffError } from "@/lib/sentry/report-bff-error";
import { unauthorizedResponse } from "@/lib/server/proxy-authenticated-json-api";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";

const ROUTE_LABEL = "/api/telegram/groups/[groupId]/connector-profile-photo";
const REQUEST_TIMEOUT_MS = 20_000;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const upstreamPath = `/telegram/groups/${encodeURIComponent(groupId)}/connector-profile-photo`;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return unauthorizedResponse();
  }

  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Upstream API not configured" },
      { status: 503 },
    );
  }

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  try {
    const upstream = await fetch(`${base}${upstreamPath}`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (upstream.status === 401) {
      return unauthorizedResponse();
    }

    if (!upstream.ok) {
      if (upstream.status >= 500) {
        reportBffError({
          route: ROUTE_LABEL,
          method: "GET",
          upstreamPath,
          status: upstream.status,
          message: "Upstream request failed",
        });
      }
      return new NextResponse(null, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    reportBffError({
      route: ROUTE_LABEL,
      method: "GET",
      upstreamPath,
      message: "Upstream request failed",
      error,
    });
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 503 },
    );
  }
}
