import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { alertContentSchema } from "@/lib/zod/alert-schemas";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/alerts/templates",
    routeLabel: "/api/alerts/templates",
  });
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

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/alerts/templates",
    routeLabel: "/api/alerts/templates",
    init: {
      method: "POST",
      body: JSON.stringify(body),
    },
  });
}
