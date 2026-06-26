import type { NextRequest } from "next/server";
import { proxyAuthenticatedBinaryApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

const ROUTE_LABEL = "/api/telegram/groups/[groupId]/chat-photo";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;

  return proxyAuthenticatedBinaryApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/chat-photo`,
    routeLabel: ROUTE_LABEL,
  });
}
