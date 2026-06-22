import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getSessionUser } from "@/lib/server/get-session";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import {
  telegramGroupMemberBulkActionRequestSchema,
  telegramGroupMemberBulkActionResultSchema,
} from "@/lib/zod/telegram-group-connection-schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = telegramGroupMemberBulkActionRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/members/actions`,
    routeLabel: "/api/telegram/groups/[groupId]/members/bulk-actions",
    timeoutMs: 60_000,
    init: {
      method: "POST",
      body: JSON.stringify(parsedBody.data),
    },
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsedResult = telegramGroupMemberBulkActionResultSchema.safeParse(raw);
  if (!parsedResult.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  const user = await getSessionUser();
  if (user) {
    revalidateTag(telegramGroupsCacheTag(user.id), "max");
  }
  revalidatePath("/members");
  revalidatePath("/groups");

  return NextResponse.json(parsedResult.data);
}
