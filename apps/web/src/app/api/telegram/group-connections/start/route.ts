import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import { startTelegramGroupConnectionResponseSchema } from "@/lib/zod/telegram-group-connection-schemas";

export async function POST(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/telegram/group-connections/start",
    routeLabel: "/api/telegram/group-connections/start",
    timeoutMs: 15_000,
    init: { method: "POST" },
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  const parsed = startTelegramGroupConnectionResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed.data);
}
