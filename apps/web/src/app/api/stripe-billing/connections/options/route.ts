import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { stripeBillingConnectionOptionsResponseSchema } from "@/lib/zod/stripe-billing-schemas";

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/stripe-billing/connections/options",
    routeLabel: "/api/stripe-billing/connections/options",
    timeoutMs: 15_000,
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  if (!stripeBillingConnectionOptionsResponseSchema.safeParse(raw).success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(raw);
}
