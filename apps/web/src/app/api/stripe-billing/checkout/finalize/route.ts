import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Upstream API not configured" },
      { status: 503 },
    );
  }

  const raw: unknown = await request.json().catch(() => null);
  if (
    !raw ||
    typeof raw !== "object" ||
    !("sessionId" in raw) ||
    typeof (raw as { sessionId?: unknown }).sessionId !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${base}/stripe-billing/checkout/finalize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(raw),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

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

    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 503 },
    );
  }
}
