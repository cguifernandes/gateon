import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import { telegramGroupConnectionIntentStatusSchema } from "@/lib/zod/telegram-group-connection-schemas";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ intentId: string }> },
) {
  const { intentId } = await ctx.params;
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/telegram/group-connections/${encodeURIComponent(intentId)}`,
    routeLabel: "/api/telegram/group-connections/[intentId]",
    timeoutMs: 15_000,
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsed = telegramGroupConnectionIntentStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed.data);
}
