import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import {
  stripeBillingCatalogSchema,
  stripeBillingPreviewCatalogSchema,
} from "@/lib/zod/stripe-billing-schemas";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = stripeBillingPreviewCatalogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/stripe-billing/catalog",
    routeLabel: "/api/stripe-billing/catalog",
    timeoutMs: 60_000,
    init: {
      method: "POST",
      body: JSON.stringify(parsed.data),
    },
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  if (!stripeBillingCatalogSchema.safeParse(raw).success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(raw);
}
