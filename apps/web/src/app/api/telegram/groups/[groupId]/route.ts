import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import { telegramGroupDetailSchema } from "@/lib/zod/telegram-group-connection-schemas";

const REQUEST_TIMEOUT_MS = 20_000;

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
  context: { params: Promise<{ groupId: string }> },
) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return unauthorizedResponse();
  }

  const { groupId } = await context.params;
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
      `${base}/telegram/groups/${encodeURIComponent(groupId)}`,
      {
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
      const body: unknown = await upstream.json().catch(() => null);
      const error =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof (body as { message?: unknown }).message === "string"
          ? (body as { message: string }).message
          : "Upstream request failed";
      return NextResponse.json(
        { error },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      );
    }

    const raw: unknown = await upstream.json();
    const parsed = telegramGroupDetailSchema.safeParse(raw);
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
