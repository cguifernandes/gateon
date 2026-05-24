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

export {
  type BotPermissionGroup,
  type BotPermissionItem,
  REQUIRED_TELEGRAM_BOT_ADMIN_PERMISSION_IDS,
  TELEGRAM_BOT_PERMISSION_GROUPS,
} from "@/lib/telegram-admin-rights";

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
