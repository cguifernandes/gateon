import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PublicUserDto } from "./zod/auth-schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function withCacheBuster(url: string, version: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

export type GatewayId = "stripe" | "pagarme" | "pagseguro";

export const SESSION_COOKIE_NAME = "gateon.session";

export type Gateway = {
  id: GatewayId;
  name: string;
  description: string;
  points: string[];
};

export function getServerApiBaseUrl(): string | null {
  const raw =
    process.env.API_URL?.trim() || process.env.INTERNAL_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}

export const PAYMENT_GATEWAYS: Gateway[] = [
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Ideal para vendas globais com foco em assinaturas e alta escala internacional.",
    points: [
      "Suporte a cartões internacionais",
      "Cobranças recorrentes nativas",
      "Alta taxa de aprovação global",
      "Perfeito para escalar fora do Brasil",
    ],
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description:
      "Infraestrutura robusta para quem precisa de controle total e integrações avançadas.",
    points: [
      "Fluxos de pagamento customizáveis via API",
      "Gestão completa de assinaturas recorrentes",
      "Webhooks em tempo real para automações",
      "Controle de antifraude e regras avançadas",
    ],
  },
  {
    id: "pagseguro",
    name: "PagSeguro",
    description:
      "Solução prática para vender no Brasil com rapidez e alta taxa de conversão.",
    points: [
      "Pix, boleto e cartão integrados",
      "Parcelamento facilitado para vendas",
      "Alta confiança do público brasileiro",
      "Integração simples e rápida",
    ],
  },
];

export type BotPermissionItem = {
  id: string;
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

export const REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_IDS = [
  "send-messages",
  "ban-users",
  "manage-invite-links",
] as const;

const REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_DETAILS: Record<
  (typeof REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_IDS)[number],
  Pick<BotPermissionItem, "title" | "description">
> = {
  "send-messages": {
    title: "Enviar mensagens",
    description:
      "Permite ao bot notificar os usuários sobre alterações de acesso, como liberações, bloqueios e avisos importantes.",
  },
  "ban-users": {
    title: "Banir usuários",
    description:
      "Necessária para remover automaticamente usuários que perderam acesso, como em casos de cancelamento ou inadimplência.",
  },
  "manage-invite-links": {
    title: "Gerenciar links de convite",
    description:
      "Permite criar e gerenciar links de acesso controlados, garantindo que apenas usuários autorizados entrem no grupo.",
  },
};

const REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_ITEMS: BotPermissionItem[] =
  REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_IDS.map((id) => ({
    id,
    ...REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_DETAILS[id],
  }));

export const TELEGRAM_BOT_PERMISSION_GROUPS: BotPermissionGroup[] = [
  {
    id: "required",
    title: "Obrigatórias",
    subtitle:
      "Permissões essenciais para o funcionamento correto do controle de acesso:",
    subgroups: [
      {
        id: "required-core",
        items: REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_ITEMS,
      },
    ],
  },
  {
    id: "optional",
    title: "Opcionais",
    subtitle: "Permissões adicionais que aumentam a segurança e automação:",
    subgroups: [
      {
        id: "optional-automation",
        items: [
          {
            id: "read-messages",
            title: "Ler mensagens",
            description:
              "Permite processar comandos e validar interações dos usuários, como confirmações via código.",
          },
          {
            id: "restrict-users",
            title: "Restringir usuários",
            description:
              "Permite limitar temporariamente as permissões de usuários (ex: silenciar), oferecendo uma alternativa ao banimento imediato.",
          },
        ],
      },
    ],
  },
];

export function getUserInitials(user: PublicUserDto) {
  const name = user.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.[0];
      const b = parts[parts.length - 1]?.[0];
      if (a && b) {
        return `${a}${b}`.toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

export const BOT_TELEGRAM_LINK = "https://t.me/GateonBot";
export const BOT_TELEGRAM_USERNAME = "@GateonBot";
