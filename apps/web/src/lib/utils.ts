import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PublicUserDto } from "@/lib/zod/auth-schemas";

export { getServerApiBaseUrl } from "@/lib/http/api-base-url";
export { SESSION_COOKIE_NAME } from "@/lib/http/session";
export {
  type Gateway,
  type GatewayId,
  PAYMENT_GATEWAYS,
} from "@/lib/integrations/gateways";
export { TELEGRAM_BOT_PERMISSION_GROUPS } from "@/lib/telegram/admin-rights";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function withCacheBuster(url: string, version: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

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
export const EMAIL_SUPPORT = "contato@gateon.com.br";
