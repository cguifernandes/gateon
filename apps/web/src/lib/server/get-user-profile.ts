import { cookies, headers } from "next/headers";
import { cache } from "react";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import { SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type UserProfileDto,
  userProfileDtoSchema,
} from "@/lib/zod/auth-schemas";
import { getServerApiBaseUrl } from "../utils";

const PROFILE_UPSTREAM_PATH = "/auth/profile";

export const getUserProfile = cache(
  async (): Promise<UserProfileDto | null> => {
    const base = getServerApiBaseUrl();
    if (!base) {
      reportServerActionError({
        action: "getUserProfile",
        upstreamPath: PROFILE_UPSTREAM_PATH,
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
      const res = await fetch(`${base}${PROFILE_UPSTREAM_PATH}`, {
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
            action: "getUserProfile",
            upstreamPath: PROFILE_UPSTREAM_PATH,
            method: "GET",
            message: "Unexpected upstream status while loading profile",
            status: res.status,
          });
        }
        return null;
      }

      const json: unknown = await res.json();
      const parsed = userProfileDtoSchema.safeParse(json);
      if (!parsed.success) {
        reportServerActionError({
          action: "getUserProfile",
          upstreamPath: PROFILE_UPSTREAM_PATH,
          method: "GET",
          message: "Invalid upstream response shape",
        });
        return null;
      }

      return parsed.data;
    } catch (error) {
      reportServerActionError({
        action: "getUserProfile",
        upstreamPath: PROFILE_UPSTREAM_PATH,
        method: "GET",
        message: "Upstream request failed while loading profile",
        error,
      });
      return null;
    }
  },
);
