import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import { alertContentSchema } from "@/lib/zod/alert-schemas";

const REQUEST_TIMEOUT_MS = 30_000;

function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

async function proxyTemplates(request: NextRequest, init?: RequestInit) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return unauthorizedResponse();

  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Upstream API not configured" },
      { status: 503 },
    );
  }

  const upstream = await fetch(`${base}/alerts/templates`, {
    ...init,
    headers: {
      "content-type": "application/json",
      Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (upstream.status === 401 || upstream.status === 403) {
    return unauthorizedResponse();
  }

  return NextResponse.json(await upstream.json().catch(() => null), {
    status: upstream.status,
  });
}

export async function GET(request: NextRequest) {
  return proxyTemplates(request);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = alertContentSchema.safeParse(
    body && typeof body === "object" && "content" in body
      ? (body as { content: unknown }).content
      : undefined,
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  return proxyTemplates(request, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
