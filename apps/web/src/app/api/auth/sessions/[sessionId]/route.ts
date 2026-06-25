import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

const ROUTE_LABEL = "/api/auth/sessions/[sessionId]";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/auth/sessions/${encodeURIComponent(sessionId)}`,
    routeLabel: ROUTE_LABEL,
    init: {
      method: "DELETE",
    },
  });
}
