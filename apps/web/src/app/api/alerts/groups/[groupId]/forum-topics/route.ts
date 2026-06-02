import { type NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";

const REQUEST_TIMEOUT_MS = 30_000;

function unauthorizedResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
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

  const { groupId } = await context.params;
  const upstream = await fetch(
    `${base}/alerts/groups/${encodeURIComponent(groupId)}/forum-topics`,
    {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (upstream.status === 401 || upstream.status === 403) {
    return unauthorizedResponse();
  }

  return NextResponse.json(await upstream.json().catch(() => null), {
    status: upstream.status,
  });
}
