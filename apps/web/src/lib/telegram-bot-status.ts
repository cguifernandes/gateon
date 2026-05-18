/**
 * Telegram ChatMember status persisted as `botStatus` on connected groups.
 * @see apps/api/src/modules/telegram/schemas/telegram-schemas.ts
 */

export type TelegramBotMemberStatus =
  | "creator"
  | "administrator"
  | "member"
  | "restricted"
  | "left"
  | "kicked";

export type BotStatusDisplayKind = "active" | "warning" | "inactive" | "error";

const DISPLAY: Record<
  BotStatusDisplayKind,
  { label: string; className: string; dotClassName: string }
> = {
  active: {
    label: "Ativo",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    dotClassName: "bg-green-500",
  },
  warning: {
    label: "Permissões pendentes",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  inactive: {
    label: "Inativo",
    className:
      "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
    dotClassName: "bg-zinc-400",
  },
  error: {
    label: "Removido",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
    dotClassName: "bg-red-500",
  },
};

export function normalizeTelegramBotStatus(rawStatus: string): string {
  return rawStatus.toLowerCase().replace(/_/g, "");
}

export function getBotStatusDisplayKind(rawStatus: string): BotStatusDisplayKind {
  const status = normalizeTelegramBotStatus(rawStatus);

  if (status === "administrator" || status === "creator") {
    return "active";
  }
  if (status === "left") {
    return "inactive";
  }
  if (status === "kicked") {
    return "error";
  }
  if (status === "member" || status === "restricted") {
    return "warning";
  }

  if (status.includes("active") || status.includes("connect")) {
    return "active";
  }
  if (status.includes("fail") || status.includes("error")) {
    return "error";
  }
  if (status.includes("pend") || status.includes("wait")) {
    return "warning";
  }

  return "inactive";
}

export function getBotStatusDisplay(rawStatus: string) {
  return DISPLAY[getBotStatusDisplayKind(rawStatus)];
}

export type BotStatusFilterValue = "all" | BotStatusDisplayKind;

export const BOT_STATUS_FILTER_OPTIONS: {
  value: BotStatusFilterValue;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "warning", label: "Permissões pendentes" },
  { value: "inactive", label: "Inativo" },
  { value: "error", label: "Removido" },
];

export function matchesBotStatusFilter(
  rawStatus: string,
  filter: BotStatusFilterValue,
): boolean {
  if (filter === "all") {
    return true;
  }

  return getBotStatusDisplayKind(rawStatus) === filter;
}
