export const BOT_START_PAYMENT_GROUP_CALLBACK_PREFIX = "pbg:";

export function buildBotStartPaymentGroupCallbackData(
  token: string,
  groupId: string,
): string {
  return `${BOT_START_PAYMENT_GROUP_CALLBACK_PREFIX}${token}:${groupId}`;
}

export function parseBotStartPaymentGroupCallbackData(
  data: string,
): { token: string; groupId: string } | null {
  if (!data.startsWith(BOT_START_PAYMENT_GROUP_CALLBACK_PREFIX)) {
    return null;
  }

  const rest = data.slice(BOT_START_PAYMENT_GROUP_CALLBACK_PREFIX.length);
  const separatorIndex = rest.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  const token = rest.slice(0, separatorIndex);
  const groupId = rest.slice(separatorIndex + 1);
  if (!token || !groupId) {
    return null;
  }

  return { token, groupId };
}
