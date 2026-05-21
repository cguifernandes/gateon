export function getTelegramChatTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case "supergroup":
      return "Supergrupo";
    case "group":
      return "Grupo";
    case "channel":
      return "Canal";
    default:
      return type;
  }
}

export function getTelegramForumLabel(isForum: boolean): string | null {
  return isForum ? "Com tópicos" : null;
}

export type TelegramGroupTypeDisplay = {
  typeLabel: string;
  forumLabel: string | null;
};

export function getTelegramGroupTypeDisplay(
  type: string,
  isForum: boolean,
): TelegramGroupTypeDisplay {
  return {
    typeLabel: getTelegramChatTypeLabel(type),
    forumLabel: getTelegramForumLabel(isForum),
  };
}
