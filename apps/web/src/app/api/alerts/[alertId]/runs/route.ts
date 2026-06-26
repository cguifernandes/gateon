import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await context.params;
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/${encodeURIComponent(alertId)}/runs`,
    routeLabel: "/api/alerts/[alertId]/runs",
  });
}
