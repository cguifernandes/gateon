import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

type RouteContext = {
  params: Promise<{ connectionId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { connectionId } = await context.params;
  const body = await request.text();

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/stripe-billing/${connectionId}/webhook-secret`,
    routeLabel: "/api/stripe-billing/[connectionId]/webhook-secret",
    init: {
      method: "PATCH",
      body,
    },
  });
}
