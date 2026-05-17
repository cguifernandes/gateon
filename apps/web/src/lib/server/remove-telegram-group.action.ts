"use server";

import { revalidateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import { getSessionUser } from "./get-session";

export async function removeTelegramGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  if (!groupId) {
    redirect("/groups");
  }

  const base = getServerApiBaseUrl();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!base || !sessionToken) {
    redirect("/groups");
  }

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? h.get("x-real-ip");

  try {
    await fetch(`${base}/telegram/groups/${encodeURIComponent(groupId)}`, {
      method: "DELETE",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    /* Keep this test action simple: the next render still shows current data. */
  }

  const user = await getSessionUser();
  if (user) {
    revalidateTag(telegramGroupsCacheTag(user.id), "max");
  }

  redirect("/groups");
}
