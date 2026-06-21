import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  stripeBillingStatusSchema,
  stripeBillingUpdateLinkedGroupSchema,
} from "@/lib/zod/stripe-billing-schemas";

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
  if (body && typeof body === "object") {
    if (
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
    if (
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
  }
  return "Upstream request failed";
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ connectionId: string }> },
) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return unauthorizedResponse();

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

  const parsed = stripeBillingUpdateLinkedGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { connectionId } = await context.params;
  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  const upstream = await fetch(
    `${base}/stripe-billing/${encodeURIComponent(connectionId)}/linked-group`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  const raw: unknown = await upstream.json().catch(() => null);
  if (upstream.status === 401 || upstream.status === 403) {
    return NextResponse.json(
      { error: readUpstreamError(raw) },
      { status: upstream.status },
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: readUpstreamError(raw) },
      { status: upstream.status >= 400 ? upstream.status : 502 },
    );
  }

  if (!stripeBillingStatusSchema.safeParse(raw).success) {
    return NextResponse.json(
      { error: "Invalid upstream response shape" },
      { status: 502 },
    );
  }

  return NextResponse.json(raw);
}
