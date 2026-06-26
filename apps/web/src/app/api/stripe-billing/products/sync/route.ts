import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

export async function POST(request: NextRequest) {
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/stripe-billing/products/sync",
    routeLabel: "/api/stripe-billing/products/sync",
    timeoutMs: 60_000,
    init: { method: "POST" },
  });
}
