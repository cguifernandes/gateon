import { cookies, headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type PublicUserDto,
  publicUserDtoSchema,
} from "@/lib/zod/auth-schemas";
import { getServerApiBaseUrl } from "../utils";

const authMeResponseSchema = z.object({
  user: publicUserDtoSchema,
});

/**
 * Validates the session cookie against the API. Deduplicated per request via `cache()`.
 */
export const getSessionUser = cache(async (): Promise<PublicUserDto | null> => {
  const base = getServerApiBaseUrl();
  if (!base) {
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
    const res = await fetch(`${base}/auth/me`, {
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
      return null;
    }

    const json: unknown = await res.json();
    const parsed = authMeResponseSchema.safeParse(json);
    if (!parsed.success) {
      return null;
    }
    return parsed.data.user;
  } catch {
    return null;
  }
});
