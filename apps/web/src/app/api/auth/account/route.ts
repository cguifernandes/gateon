import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { SESSION_COOKIE_NAME } from "@/lib/utils";
import { deleteAccountRequestSchema } from "@/lib/zod/auth-schemas";

const ROUTE_LABEL = "/api/auth/account";
const UPSTREAM_PATH = "/auth/account";

export async function DELETE(request: NextRequest) {
  const raw: unknown = await request.json().catch(() => null);
  const parsed = deleteAccountRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirmação obrigatória." },
      { status: 400 },
    );
  }

  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: UPSTREAM_PATH,
    routeLabel: ROUTE_LABEL,
    timeoutMs: 60_000,
    init: {
      method: "DELETE",
      body: JSON.stringify(parsed.data),
    },
  });

  if (!response.ok) {
    return response;
  }

  const nextResponse = NextResponse.json({ ok: true });
  nextResponse.cookies.delete(SESSION_COOKIE_NAME);
  return nextResponse;
}
