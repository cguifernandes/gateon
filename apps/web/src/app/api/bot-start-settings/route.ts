import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  telegramBotStartSettingsPatchSchema,
  telegramBotStartSettingsResponseSchema,
} from "@/lib/zod/bot-start-settings-schemas";

const REQUEST_TIMEOUT_MS = 20_000;

function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

async function proxySettingsRequest(
  request: NextRequest,
  init?: { method?: "GET" | "PATCH"; body?: unknown },
) {
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
    const upstream = await fetch(`${base}/bot-start-settings`, {
      method: init?.method ?? "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (upstream.status === 401) {
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
    const parsed = telegramBotStartSettingsResponseSchema.safeParse(raw);
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

export async function GET(request: NextRequest) {
  return proxySettingsRequest(request);
}

export async function PATCH(request: NextRequest) {
  const raw: unknown = await request.json().catch(() => null);
  const parsed = telegramBotStartSettingsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const response = await proxySettingsRequest(request, {
    method: "PATCH",
    body: parsed.data,
  });

  if (response.ok) {
    revalidatePath("/settings");
  }

  return response;
}
