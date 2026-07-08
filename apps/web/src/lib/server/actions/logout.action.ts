"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerApiBaseUrl } from "@/lib/http/api-base-url";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import { SESSION_COOKIE_NAME } from "@/lib/utils";

const ACTION = "logoutAction";
const UPSTREAM_PATH = "/auth/logout";

export async function logoutAction(): Promise<void> {
  const base = getServerApiBaseUrl();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!base && sessionToken) {
    reportServerActionError({
      action: ACTION,
      upstreamPath: UPSTREAM_PATH,
      message: "Upstream API not configured",
    });
  }

  if (base && sessionToken) {
    const h = await headers();
    const xfwd = h.get("x-forwarded-for");
    const realIp = h.get("x-real-ip");

    try {
      const response = await fetch(`${base}${UPSTREAM_PATH}`, {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          ...(xfwd ? { "x-forwarded-for": xfwd } : {}),
          ...(!xfwd && realIp ? { "x-forwarded-for": realIp } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok && response.status !== 401) {
        reportServerActionError({
          action: ACTION,
          upstreamPath: UPSTREAM_PATH,
          message: "Unexpected upstream status during logout",
          status: response.status,
        });
      }
    } catch (error) {
      reportServerActionError({
        action: ACTION,
        upstreamPath: UPSTREAM_PATH,
        message: "Upstream request failed during logout",
        error,
      });
    }
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    path: "/",
    ...(process.env.COOKIE_DOMAIN
      ? { domain: process.env.COOKIE_DOMAIN }
      : {}),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  redirect("/");
}
