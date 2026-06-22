import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

type RouteContext = {
  params: Promise<{ connectionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { connectionId } = await context.params;
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/stripe-billing/${connectionId}/sync`,
    routeLabel: "/api/stripe-billing/[connectionId]/sync",
    timeoutMs: 120_000,
    init: { method: "POST" },
  });
}
