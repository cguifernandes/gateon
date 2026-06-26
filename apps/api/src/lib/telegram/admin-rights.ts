/**
 * Telegram Bot API: ChatMemberAdministrator boolean flags.
 * @see https://core.telegram.org/bots/api#chatmemberadministrator
 *
 * There is no API to list "group permissions" in the abstract — only the rights
 * granted to a specific member (here, the bot) via getChatMember / my_chat_member.
 */

export const TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS = [
  {
    key: 'canManageChat',
    apiField: 'can_manage_chat',
    title: 'Gerenciar o chat',
    description:
      'Acesso ao histórico do chat e recursos de gestão do grupo (inclui enviar mensagens como administrador).',
    requiredForGateon: true,
  },
  {
    key: 'canRestrictMembers',
    apiField: 'can_restrict_members',
    title: 'Banir usuários',
    description:
      'Necessária para remover membros sem assinatura ativa ou que perderam o acesso.',
    requiredForGateon: true,
  },
  {
    key: 'canInviteUsers',
    apiField: 'can_invite_users',
    title: 'Convidar usuários via link',
    description:
      'Permite criar e gerenciar links de convite controlados para o grupo.',
    requiredForGateon: true,
  },
  {
    key: 'canDeleteMessages',
    apiField: 'can_delete_messages',
    title: 'Apagar mensagens',
    description: 'Permite remover mensagens enviadas por engano ou spam.',
    requiredForGateon: false,
  },
  {
    key: 'canPinMessages',
    apiField: 'can_pin_messages',
    title: 'Fixar mensagens',
    description: 'Permite fixar avisos importantes no grupo.',
    requiredForGateon: false,
  },
  {
    key: 'canChangeInfo',
    apiField: 'can_change_info',
    title: 'Alterar informações do grupo',
    description: 'Permite editar nome, foto e descrição do grupo.',
    requiredForGateon: false,
  },
  {
    key: 'canPromoteMembers',
    apiField: 'can_promote_members',
    title: 'Adicionar administradores',
    description: 'Permite promover outros membros a administradores.',
    requiredForGateon: false,
  },
  {
    key: 'canManageVideoChats',
    apiField: 'can_manage_video_chats',
    title: 'Gerenciar videochats',
    description: 'Permite gerenciar transmissões ao vivo e videochats do grupo.',
    requiredForGateon: false,
  },
  {
    key: 'canManageTopics',
    apiField: 'can_manage_topics',
    title: 'Gerenciar tópicos',
    description: 'Relevante em supergrupos com tópicos (fórum).',
    requiredForGateon: false,
  },
] as const;

export type TelegramAdministratorRightKey =
  (typeof TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS)[number]['key'];

export type TelegramAdministratorRightApiField =
  (typeof TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS)[number]['apiField'];

export type TelegramGroupAdministratorRights = Record<
  TelegramAdministratorRightKey,
  boolean
>;

export const REQUIRED_TELEGRAM_GROUP_ADMIN_RIGHT_IDS =
  TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.filter((d) => d.requiredForGateon).map(
    (d) => d.key,
  );

export type RequiredTelegramGroupAdminRightId =
  (typeof REQUIRED_TELEGRAM_GROUP_ADMIN_RIGHT_IDS)[number];

const RIGHT_BY_KEY = new Map(
  TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.map((d) => [d.key, d]),
);

/** @deprecated IDs used before aligning with Telegram API field names */
const LEGACY_RIGHT_TITLES: Record<string, string> = {
  'send-messages': 'Gerenciar o chat',
  'ban-users': 'Banir usuários',
  'manage-invite-links': 'Convidar usuários via link',
};

export function noTelegramGroupAdministratorRights(): TelegramGroupAdministratorRights {
  return Object.fromEntries(
    TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.map((d) => [d.key, false]),
  ) as TelegramGroupAdministratorRights;
}

export function parseTelegramGroupAdministratorRights(
  raw: Record<string, unknown>,
  botStatus: string,
): TelegramGroupAdministratorRights | null {
  const isPrivileged =
    botStatus === 'administrator' || botStatus === 'creator';
  if (!isPrivileged) {
    return null;
  }

  const allGranted = botStatus === 'creator';
  return Object.fromEntries(
    TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.map((d) => [
      d.key,
      allGranted || raw[d.apiField] === true,
    ]),
  ) as TelegramGroupAdministratorRights;
}

export function listMissingRequiredAdministratorRights(
  rights: Partial<TelegramGroupAdministratorRights>,
): RequiredTelegramGroupAdminRightId[] {
  const missing: RequiredTelegramGroupAdminRightId[] = [];
  for (const id of REQUIRED_TELEGRAM_GROUP_ADMIN_RIGHT_IDS) {
    if (!rights[id]) {
      missing.push(id);
    }
  }
  return missing;
}

export function getTelegramAdminRightTitle(
  rightId: string,
): string | undefined {
  const def = RIGHT_BY_KEY.get(rightId as TelegramAdministratorRightKey);
  if (def) {
    return def.title;
  }
  return LEGACY_RIGHT_TITLES[rightId];
}

export function parseTelegramGroupAdministratorRightsPayload(
  payload: Partial<TelegramGroupAdministratorRights> | undefined,
): TelegramGroupAdministratorRights {
  const base = noTelegramGroupAdministratorRights();
  if (!payload) {
    return base;
  }
  for (const d of TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS) {
    if (d.key in payload) {
      base[d.key] = payload[d.key] === true;
    }
  }
  return base;
}

