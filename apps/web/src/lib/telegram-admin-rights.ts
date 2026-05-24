/**
 * Telegram ChatMemberAdministrator flags (Bot API).
 * Keep in sync with `apps/api/src/lib/telegram-admin-rights.ts`.
 */

export const TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS = [
  {
    key: "canManageChat",
    title: "Gerenciar o chat",
    description:
      "Acesso ao histórico do chat e recursos de gestão do grupo (inclui enviar mensagens como administrador).",
    requiredForGateon: true,
  },
  {
    key: "canRestrictMembers",
    title: "Banir usuários",
    description:
      "Necessária para remover membros sem assinatura ativa ou que perderam o acesso.",
    requiredForGateon: true,
  },
  {
    key: "canInviteUsers",
    title: "Convidar usuários via link",
    description:
      "Permite criar e gerenciar links de convite controlados para o grupo.",
    requiredForGateon: true,
  },
  {
    key: "canDeleteMessages",
    title: "Apagar mensagens",
    description: "Permite remover mensagens enviadas por engano ou spam.",
    requiredForGateon: false,
  },
  {
    key: "canPinMessages",
    title: "Fixar mensagens",
    description: "Permite fixar avisos importantes no grupo.",
    requiredForGateon: false,
  },
  {
    key: "canChangeInfo",
    title: "Alterar informações do grupo",
    description: "Permite editar nome, foto e descrição do grupo.",
    requiredForGateon: false,
  },
  {
    key: "canPromoteMembers",
    title: "Adicionar administradores",
    description: "Permite promover outros membros a administradores.",
    requiredForGateon: false,
  },
  {
    key: "canManageVideoChats",
    title: "Gerenciar videochats",
    description: "Permite gerenciar transmissões ao vivo e videochats do grupo.",
    requiredForGateon: false,
  },
  {
    key: "canManageTopics",
    title: "Gerenciar tópicos",
    description: "Relevante em supergrupos com tópicos (fórum).",
    requiredForGateon: false,
  },
] as const;

export type TelegramAdministratorRightKey =
  (typeof TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS)[number]["key"];

export type TelegramGroupAdministratorRights = Record<
  TelegramAdministratorRightKey,
  boolean
>;

export const REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_IDS =
  TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.filter(
    (d) => d.requiredForGateon,
  ).map((d) => d.key);

export type BotPermissionItem = {
  id: TelegramAdministratorRightKey;
  title: string;
  description: string;
};

export type BotPermissionSubgroup = {
  id: string;
  items: BotPermissionItem[];
};

export type BotPermissionGroup = {
  id: string;
  title: string;
  subtitle: string;
  subgroups: BotPermissionSubgroup[];
};

const toPermissionItem = (
  d: (typeof TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS)[number],
): BotPermissionItem => ({
  id: d.key,
  title: d.title,
  description: d.description,
});

export const TELEGRAM_BOT_PERMISSION_GROUPS: BotPermissionGroup[] = [
  {
    id: "required",
    title: "Obrigatórias no Telegram",
    subtitle:
      "Ative estas opções ao promover o Gateon em Administradores (mesmos nomes do app do Telegram):",
    subgroups: [
      {
        id: "required-core",
        items: TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.filter(
          (d) => d.requiredForGateon,
        ).map(toPermissionItem),
      },
    ],
  },
  {
    id: "optional",
    title: "Opcionais",
    subtitle: "Permissões extras que o Telegram oferece para administradores:",
    subgroups: [
      {
        id: "optional-extra",
        items: TELEGRAM_ADMINISTRATOR_RIGHT_DEFINITIONS.filter(
          (d) => !d.requiredForGateon,
        ).map(toPermissionItem),
      },
    ],
  },
];
