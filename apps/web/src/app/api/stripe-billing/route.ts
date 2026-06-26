import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import {
  stripeBillingConnectSchema,
  stripeBillingStatusSchema,
} from "@/lib/zod/stripe-billing-schemas";

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/stripe-billing",
    routeLabel: "/api/stripe-billing",
    timeoutMs: 60_000,
  });
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  if (response.ok && !stripeBillingStatusSchema.safeParse(body).success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }
  return response;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = stripeBillingConnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/stripe-billing/connect",
    routeLabel: "/api/stripe-billing",
    timeoutMs: 60_000,
    init: {
      method: "POST",
      body: JSON.stringify(parsed.data),
    },
  });
}
