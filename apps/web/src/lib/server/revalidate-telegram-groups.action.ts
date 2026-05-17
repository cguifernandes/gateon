"use server";

import { refresh, revalidateTag } from "next/cache";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getSessionUser } from "./get-session";

export async function revalidateTelegramGroupsAction(): Promise<{
  ok: boolean;
}> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false };
  }

  revalidateTag(telegramGroupsCacheTag(user.id), "max");
  refresh();
  return { ok: true };
}
