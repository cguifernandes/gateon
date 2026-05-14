import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import { telegramGroupConnectionIntentStatusSchema } from "@/lib/zod/telegram-group-connection-schemas";

const REQUEST_TIMEOUT_MS = 15_000;

function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ intentId: string }> },
) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return unauthorizedResponse();
  }

  const { intentId } = await ctx.params;
  const encodedId = encodeURIComponent(intentId);

  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Upstream API not configured" },
      { status: 503 },
    );
  }

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  try {
    const upstream = await fetch(
      `${base}/telegram/group-connections/${encodedId}`,
      {
        method: "GET",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (upstream.status === 401 || upstream.status === 403) {
      return unauthorizedResponse();
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: text || "Upstream request failed" },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      );
    }

    const raw: unknown = await upstream.json();
    const parsed = telegramGroupConnectionIntentStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid upstream response shape" },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed.data);
  } catch {
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 503 },
    );
  }
}
