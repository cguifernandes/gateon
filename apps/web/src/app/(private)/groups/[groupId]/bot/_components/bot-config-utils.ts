import {
  TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS,
  type TelegramAdministratorRightKey,
  type TelegramGroupAdministratorRights,
} from "@/lib/telegram/admin-rights";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";

export type BotPermissionStatus = "active" | "missing" | "attention";

export type BotPermissionChecklistItem = {
  id: string;
  title: string;
  description: string;
  status: BotPermissionStatus;
};

type PermissionSnapshot = NonNullable<TelegramGroupDetailDto["permissions"]>;

function getPermissionStatus(
  granted: boolean,
  rightKey: TelegramAdministratorRightKey,
  permissions: PermissionSnapshot | null,
): BotPermissionStatus {
  if (granted) {
    return "active";
  }

  if (permissions?.missingRequiredRightIds.includes(rightKey)) {
    return "attention";
  }

  return "missing";
}

export function buildBotPermissionItems(
  permissions: TelegramGroupDetailDto["permissions"],
): BotPermissionChecklistItem[] {
  const rights: TelegramGroupAdministratorRights | null =
    permissions?.administratorRights ?? null;

  const ordered = [
    ...TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.filter(
      (d) => d.requiredForGateon,
    ),
    ...TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.filter(
      (d) => !d.requiredForGateon,
    ),
  ];

  return ordered.map((definition) => ({
    id: definition.key,
    title: definition.title,
    description: definition.description,
    status: getPermissionStatus(
      rights?.[definition.key] === true,
      definition.key,
      permissions,
    ),
  }));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatTelegramGroupType(type: string, isForum: boolean) {
  if (isForum) {
    return "Supergrupo com tópicos";
  }
  if (type === "supergroup") {
    return "Supergrupo";
  }
  if (type === "group") {
    return "Grupo";
  }
  return type;
}
