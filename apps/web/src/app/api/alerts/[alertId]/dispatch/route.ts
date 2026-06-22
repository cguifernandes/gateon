import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await context.params;
  const body: unknown = await request.json().catch(() => null);

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/${encodeURIComponent(alertId)}/dispatch`,
    routeLabel: "/api/alerts/[alertId]/dispatch",
    init: {
      method: "POST",
      body: JSON.stringify(body),
    },
  });
}
