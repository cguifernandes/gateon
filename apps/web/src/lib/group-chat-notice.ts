import { DEFAULT_MEMBER_NOTICE_TEXT } from "@/lib/member-actions";
import {
  type TelegramGroupChatNoticeResultDto,
  telegramGroupChatNoticeResultSchema,
} from "@/lib/zod/telegram-group-chat-notice-schemas";

export async function postGroupChatNotice(
  groupId: string,
  text: string = DEFAULT_MEMBER_NOTICE_TEXT,
): Promise<TelegramGroupChatNoticeResultDto> {
  const response = await fetch(
    `/api/telegram/groups/${encodeURIComponent(groupId)}/chat-notice`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      raw &&
      typeof raw === "object" &&
      "error" in raw &&
      typeof (raw as { error?: unknown }).error === "string"
        ? (raw as { error: string }).error
        : "Não foi possível enviar o aviso no grupo.";
    throw new Error(message);
  }

  const parsed = telegramGroupChatNoticeResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Resposta inválida do servidor.");
  }

  return parsed.data;
}
