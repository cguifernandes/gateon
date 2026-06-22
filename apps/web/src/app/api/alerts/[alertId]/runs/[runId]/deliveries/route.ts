import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ alertId: string; runId: string }> },
) {
  const { alertId, runId } = await context.params;
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/${encodeURIComponent(alertId)}/runs/${encodeURIComponent(runId)}/deliveries`,
    routeLabel: "/api/alerts/[alertId]/runs/[runId]/deliveries",
  });
}
