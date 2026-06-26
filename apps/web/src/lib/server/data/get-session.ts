import { cookies, headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";
import { getServerApiBaseUrl } from "@/lib/http/api-base-url";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import { SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type PublicUserDto,
  publicUserDtoSchema,
} from "@/lib/zod/auth-schemas";

const authMeResponseSchema = z.object({
  user: publicUserDtoSchema,
});

const SESSION_UPSTREAM_PATH = "/auth/me";

/**
 * Validates the session cookie against the API. Deduplicated per request via `cache()`.
 */
export const getSessionUser = cache(async (): Promise<PublicUserDto | null> => {
  const base = getServerApiBaseUrl();
  if (!base) {
    reportServerActionError({
      action: "getSessionUser",
      upstreamPath: SESSION_UPSTREAM_PATH,
      method: "GET",
      message: "Upstream API not configured",
    });
    return null;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return null;
  }

  const h = await headers();
  const xfwd = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");

  try {
    const res = await fetch(`${base}${SESSION_UPSTREAM_PATH}`, {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(xfwd ? { "x-forwarded-for": xfwd } : {}),
        ...(!xfwd && realIp ? { "x-forwarded-for": realIp } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status >= 500) {
        reportServerActionError({
          action: "getSessionUser",
          upstreamPath: SESSION_UPSTREAM_PATH,
          method: "GET",
          message: "Unexpected upstream status while loading session",
          status: res.status,
        });
      }
      return null;
    }

    const json: unknown = await res.json();
    const parsed = authMeResponseSchema.safeParse(json);
    if (!parsed.success) {
      reportServerActionError({
        action: "getSessionUser",
        upstreamPath: SESSION_UPSTREAM_PATH,
        method: "GET",
        message: "Invalid upstream response shape",
      });
      return null;
    }
    return parsed.data.user;
  } catch (error) {
    reportServerActionError({
      action: "getSessionUser",
      upstreamPath: SESSION_UPSTREAM_PATH,
      method: "GET",
      message: "Upstream request failed while loading session",
      error,
    });
    return null;
  }
});
