import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

const ALLOWED_ACTIONS = new Set([
  "duplicate",
  "pause",
  "activate",
  "run",
  "test",
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ alertId: string; action: string }> },
) {
  const { alertId, action } = await context.params;
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/${encodeURIComponent(alertId)}/${action}`,
    routeLabel: "/api/alerts/[alertId]/[action]",
    init: { method: "POST" },
  });
}
