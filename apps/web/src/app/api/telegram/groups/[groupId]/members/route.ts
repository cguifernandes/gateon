import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import { telegramGroupMembersListResponseSchema } from "@/lib/zod/telegram-group-connection-schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/members`,
    routeLabel: "/api/telegram/groups/[groupId]/members",
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsed = telegramGroupMembersListResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed.data);
}
