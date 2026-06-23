/**
 * Telegram ChatMember status persisted as `botStatus` on connected groups.
 * @see apps/api/src/lib/zod/telegram-schemas.ts
 */

export type TelegramBotMemberStatus =
  | "creator"
  | "administrator"
  | "member"
  | "restricted"
  | "left"
  | "kicked";

export type BotStatusDisplayKind = "active" | "warning" | "inactive" | "error";

export type BotStatusBadgeVariant =
  | "outline"
  | "destructive"
  | "alert"
  | "ghost";

export type BotStatusDisplay = {
  label: string;
  variant: BotStatusBadgeVariant;
  className?: string;
  dotClassName?: string;
};

const DISPLAY: Record<BotStatusDisplayKind, BotStatusDisplay> = {
  active: {
    label: "Ativo",
    variant: "outline",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    dotClassName: "bg-green-500",
  },
  warning: {
    label: "Permissões pendentes",
    variant: "alert",
  },
  inactive: {
    label: "Inativo",
    variant: "ghost",
    className:
      "border-border bg-muted/60 text-muted-foreground dark:bg-muted/40",
    dotClassName: "bg-muted-foreground/70",
  },
  error: {
    label: "Removido",
    variant: "destructive",
  },
};

export function normalizeTelegramBotStatus(rawStatus: string): string {
  return rawStatus.toLowerCase().replace(/_/g, "");
}

export function getBotStatusDisplayKind(
  rawStatus: string,
): BotStatusDisplayKind {
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

const CONFIG_LABELS: Record<BotStatusDisplayKind, string> = {
  active: "Online",
  warning: "Sem permissões",
  inactive: "Necessita reconexão",
  error: "Removido",
};

export function getBotConfigStatusDisplay(rawStatus: string) {
  const kind = getBotStatusDisplayKind(rawStatus);
  return {
    ...DISPLAY[kind],
    label: CONFIG_LABELS[kind],
  };
}

export function getBotPermissionsHealthDisplay(
  hasRequiredPermissions: boolean,
  missingCount = 0,
): BotStatusDisplay {
  if (hasRequiredPermissions) {
    return {
      label: "Saudável",
      variant: "outline",
      className: DISPLAY.active.className,
      dotClassName: DISPLAY.active.dotClassName,
    };
  }

  return {
    label: `${missingCount} pendente`,
    variant: "alert",
  };
}

export function getTrackedMemberStatusDisplay(status: "active" | "left") {
  return status === "left" ? DISPLAY.inactive : DISPLAY.active;
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
