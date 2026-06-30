import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

export async function POST(request: NextRequest) {
  const body = await request.clone().text();
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/billing/checkout",
    routeLabel: "/api/billing/checkout",
    init: {
      method: "POST",
      body,
    },
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    return response;
  }

  const data: unknown = await response.json();
  return NextResponse.json(data);
}
