import { type NextRequest, NextResponse } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { updateProfileRequestSchema } from "@/lib/zod/auth-schemas";

const ROUTE_LABEL = "/api/auth/profile";
const UPSTREAM_PATH = "/auth/profile";

export async function PATCH(request: NextRequest) {
  const raw: unknown = await request.json().catch(() => null);
  const parsed = updateProfileRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: UPSTREAM_PATH,
    routeLabel: ROUTE_LABEL,
    init: {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    },
  });
}
