import type { NextRequest } from "next/server";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

const ROUTE_LABEL = "/api/auth/sessions";
const UPSTREAM_PATH = "/auth/sessions";

export async function DELETE(request: NextRequest) {
  return proxyAuthenticatedJsonApi({
    request,
    upstreamPath: UPSTREAM_PATH,
    routeLabel: ROUTE_LABEL,
    init: {
      method: "DELETE",
    },
  });
}
