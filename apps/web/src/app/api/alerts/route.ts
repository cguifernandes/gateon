import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import {
  alertsResponseSchema,
  alertUpsertSchema,
} from "@/lib/zod/alert-schemas";

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/alerts",
    routeLabel: "/api/alerts",
    search: request.nextUrl.search,
  });
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  if (response.ok && !alertsResponseSchema.safeParse(body).success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }
  return response;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = alertUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/alerts",
    routeLabel: "/api/alerts",
    init: {
      method: "POST",
      body: JSON.stringify(parsed.data),
    },
  });
}
