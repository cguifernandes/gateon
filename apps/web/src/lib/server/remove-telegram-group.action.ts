"use server";

import { revalidateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import { getSessionUser } from "./get-session";

const ACTION = "removeTelegramGroupAction";

export async function removeTelegramGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  if (!groupId) {
    redirect("/groups");
  }

  const upstreamPath = `/telegram/groups/${encodeURIComponent(groupId)}`;
  const base = getServerApiBaseUrl();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!base) {
    reportServerActionError({
      action: ACTION,
      upstreamPath,
      method: "DELETE",
      message: "Upstream API not configured",
    });
    redirect("/groups");
  }

  if (!sessionToken) {
    redirect("/groups");
  }

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? h.get("x-real-ip");

  try {
    const response = await fetch(`${base}${upstreamPath}`, {
      method: "DELETE",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok && response.status !== 401 && response.status !== 404) {
      reportServerActionError({
        action: ACTION,
        upstreamPath,
        method: "DELETE",
        message: "Unexpected upstream status while removing group",
        status: response.status,
      });
    }
  } catch (error) {
    reportServerActionError({
      action: ACTION,
      upstreamPath,
      method: "DELETE",
      message: "Upstream request failed while removing group",
      error,
    });
  }

  const user = await getSessionUser();
  if (user) {
    revalidateTag(telegramGroupsCacheTag(user.id), "max");
  }

  redirect("/groups");
}
