import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/alerts/groups/${encodeURIComponent(groupId)}/forum-topics`,
    routeLabel: "/api/alerts/groups/[groupId]/forum-topics",
  });
}
