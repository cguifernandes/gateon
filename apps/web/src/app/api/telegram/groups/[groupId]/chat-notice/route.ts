import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  telegramGroupChatNoticeRequestSchema,
  telegramGroupChatNoticeResultSchema,
} from "@/lib/zod/telegram-group-chat-notice-schemas";

const REQUEST_TIMEOUT_MS = 30_000;

function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

function readUpstreamError(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }

  return "Upstream request failed";
}

export async function POST(
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

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  try {
    const upstream = await fetch(
      `${base}/telegram/groups/${encodeURIComponent(groupId)}/chat-notice`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        },
        body: JSON.stringify(parsedBody.data),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (upstream.status === 401 || upstream.status === 403) {
      return unauthorizedResponse();
    }

    const raw: unknown = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: readUpstreamError(raw) },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      );
    }

    const parsedResult = telegramGroupChatNoticeResultSchema.safeParse(raw);
    if (!parsedResult.success) {
      return NextResponse.json(
        { error: "Invalid upstream response shape" },
        { status: 502 },
      );
    }

    return NextResponse.json(parsedResult.data);
  } catch {
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 503 },
    );
  }
}
