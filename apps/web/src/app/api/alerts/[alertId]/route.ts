import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import { alertUpsertSchema } from "@/lib/zod/alert-schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await context.params;
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/${encodeURIComponent(alertId)}`,
    routeLabel: "/api/alerts/[alertId]",
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = alertUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { alertId } = await context.params;
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/${encodeURIComponent(alertId)}`,
    routeLabel: "/api/alerts/[alertId]",
    init: {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await context.params;
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/${encodeURIComponent(alertId)}`,
    routeLabel: "/api/alerts/[alertId]",
    init: { method: "DELETE" },
  });
}
