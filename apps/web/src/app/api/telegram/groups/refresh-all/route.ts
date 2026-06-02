import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getSessionUser } from "@/lib/server/get-session";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";

const REQUEST_TIMEOUT_MS = 120_000;

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

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return unauthorizedResponse();
  }

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
    const upstream = await fetch(`${base}/telegram/groups/refresh-all`, {
      method: "POST",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (upstream.status === 401 || upstream.status === 403) {
      return unauthorizedResponse();
    }

    if (!upstream.ok) {
      const body: unknown = await upstream.json().catch(() => null);
      return NextResponse.json(
        { error: readUpstreamError(body) },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      );
    }

    const user = await getSessionUser();
    if (user) {
      revalidateTag(telegramGroupsCacheTag(user.id), "max");
    }
    revalidatePath("/groups");
    revalidatePath("/members");

    const body: unknown = await upstream.json().catch(() => null);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 503 },
    );
  }
}
