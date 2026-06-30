import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/billing/subscription",
    routeLabel: "/api/billing/subscription",
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    return response;
  }

  const data: unknown = await response.json();
  return NextResponse.json(data);
}