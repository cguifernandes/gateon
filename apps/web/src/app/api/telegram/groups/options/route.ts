import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";
import { telegramGroupOptionsResponseSchema } from "@/lib/zod/telegram-group-connection-schemas";

export async function GET(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/telegram/groups/options",
    routeLabel: "/api/telegram/groups/options",
    timeoutMs: 15_000,
  });

  if (!response.ok) {
    return response;
  }

  const raw: unknown = await response.json();
  if (!telegramGroupOptionsResponseSchema.safeParse(raw).success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(raw);
}
