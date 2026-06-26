import { type NextRequest, NextResponse } from "next/server";
import { readUpstreamError } from "@/lib/http/read-error-body";
import { reportBffError } from "@/lib/sentry/report-bff-error";
import { getServerApiBaseUrl } from "@/lib/utils";

const ROUTE_LABEL = "/api/stripe-billing/checkout/finalize";
const UPSTREAM_PATH = "/stripe-billing/checkout/finalize";

export async function POST(request: NextRequest) {
  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Upstream API not configured" },
      { status: 503 },
    );
  }

  const raw: unknown = await request.json().catch(() => null);
  if (
    !raw ||
    typeof raw !== "object" ||
    !("sessionId" in raw) ||
    typeof (raw as { sessionId?: unknown }).sessionId !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${base}${UPSTREAM_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(raw),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      const body: unknown = await upstream.json().catch(() => null);
      reportBffError({
        route: ROUTE_LABEL,
        method: "POST",
        upstreamPath: UPSTREAM_PATH,
        status: upstream.status,
        message: readUpstreamError(body),
      });
      return NextResponse.json(
        { error: readUpstreamError(body) },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      );
    }

    return NextResponse.json(await upstream.json());
  } catch (error) {
    reportBffError({
      route: ROUTE_LABEL,
      method: "POST",
      upstreamPath: UPSTREAM_PATH,
      message: "Upstream request failed",
      error,
    });
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 503 },
    );
  }
}
