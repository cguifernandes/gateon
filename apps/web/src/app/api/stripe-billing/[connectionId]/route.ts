import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { stripeBillingStatusSchema } from "@/lib/zod/stripe-billing-schemas";

type RouteContext = {
  params: Promise<{ connectionId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { connectionId } = await context.params;

  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/stripe-billing/${connectionId}`,
    routeLabel: "/api/stripe-billing/[connectionId]",
    timeoutMs: 60_000,
    init: { method: "DELETE" },
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  if (!stripeBillingStatusSchema.safeParse(raw).success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(raw);
}
