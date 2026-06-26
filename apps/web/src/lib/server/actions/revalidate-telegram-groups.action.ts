"use server";

import { refresh, revalidateTag } from "next/cache";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import { telegramGroupsCacheTag } from "@/lib/telegram/cache-tags";
import { getSessionUser } from "../data/get-session";

const ACTION = "revalidateTelegramGroupsAction";

export async function revalidateTelegramGroupsAction(): Promise<{
  ok: boolean;
}> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false };
    }

    revalidateTag(telegramGroupsCacheTag(user.id), "max");
    refresh();
    return { ok: true };
  } catch (error) {
    reportServerActionError({
      action: ACTION,
      upstreamPath: "/auth/me",
      method: "GET",
      message: "Failed to revalidate telegram groups cache",
      error,
    });
    return { ok: false };
  }
}
