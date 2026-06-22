import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getSessionUser } from "@/lib/server/get-session";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import {
  telegramGroupBotSettingsPatchSchema,
  telegramGroupBotSettingsSchema,
} from "@/lib/zod/telegram-group-bot-settings-schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/bot-settings`,
    routeLabel: "/api/telegram/groups/[groupId]/bot-settings",
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsed = telegramGroupBotSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed.data);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const raw: unknown = await request.json().catch(() => null);
  const parsed = telegramGroupBotSettingsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/bot-settings`,
    routeLabel: "/api/telegram/groups/[groupId]/bot-settings",
    timeoutMs: 20_000,
    init: {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    },
  });

  if (!response.ok) {
    return response;
  }

  const upstreamRaw: unknown = await response.json();
  const upstreamParsed = telegramGroupBotSettingsSchema.safeParse(upstreamRaw);
  if (!upstreamParsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  const user = await getSessionUser();
  if (user) {
    revalidateTag(telegramGroupsCacheTag(user.id), "max");
  }
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}/bot`);

  return NextResponse.json(upstreamParsed.data);
}
