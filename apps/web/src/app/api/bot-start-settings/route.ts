import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import {
  telegramBotStartSettingsPatchSchema,
  telegramBotStartSettingsResponseSchema,
} from "@/lib/zod/bot-start-settings-schemas";

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/bot-start-settings",
    routeLabel: "/api/bot-start-settings",
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsed = telegramBotStartSettingsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed.data);
}

export async function PATCH(request: NextRequest) {
  const raw: unknown = await request.json().catch(() => null);
  const parsed = telegramBotStartSettingsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/bot-start-settings",
    routeLabel: "/api/bot-start-settings",
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
  const upstreamParsed =
    telegramBotStartSettingsResponseSchema.safeParse(upstreamRaw);
  if (!upstreamParsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  revalidatePath("/settings");
  return NextResponse.json(upstreamParsed.data);
}
