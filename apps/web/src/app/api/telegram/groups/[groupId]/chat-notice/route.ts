import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import {
  telegramGroupChatNoticeRequestSchema,
  telegramGroupChatNoticeResultSchema,
} from "@/lib/zod/telegram-group-chat-notice-schemas";

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

  const parsedBody = telegramGroupChatNoticeRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/chat-notice`,
    routeLabel: "/api/telegram/groups/[groupId]/chat-notice",
    timeoutMs: 30_000,
    init: {
      method: "POST",
      body: JSON.stringify(parsedBody.data),
    },
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsedResult = telegramGroupChatNoticeResultSchema.safeParse(raw);
  if (!parsedResult.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsedResult.data);
}
