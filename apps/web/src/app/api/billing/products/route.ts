import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { availablePlanSchema } from "@/lib/zod/billing-schemas";

const productsResponseSchema = z.array(availablePlanSchema);

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/billing/products",
    routeLabel: "/api/billing/products",
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsed = productsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed.data);
}
