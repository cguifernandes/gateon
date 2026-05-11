"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/utils";
import { getServerApiBaseUrl } from "../utils";

export async function logoutAction(): Promise<void> {
  const base = getServerApiBaseUrl();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (base && sessionToken) {
    const h = await headers();
    const xfwd = h.get("x-forwarded-for");
    const realIp = h.get("x-real-ip");

    try {
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          ...(xfwd ? { "x-forwarded-for": xfwd } : {}),
          ...(!xfwd && realIp ? { "x-forwarded-for": realIp } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      /* still clear local cookie */
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
