import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import {
  stripeBillingStatusSchema,
  stripeBillingUpdateLinkedGroupSchema,
} from "@/lib/zod/stripe-billing-schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ connectionId: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = stripeBillingUpdateLinkedGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { connectionId } = await context.params;
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/stripe-billing/${encodeURIComponent(connectionId)}/linked-group`,
    routeLabel: "/api/stripe-billing/[connectionId]/linked-group",
    init: {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    },
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
