import type { UserProfileDto } from "@/lib/zod/auth-schemas";
import { formatProfileDateTime } from "./profile-format";

export type ProfileSessionDto = UserProfileDto["sessions"][number];

export function getSessionDeviceTitle(session: ProfileSessionDto) {
  if (session.isCurrent) {
    return "Este dispositivo";
  }

  if (session.hasUserAgentMetadata) {
    return "Navegador web";
  }

  return "Dispositivo desconhecido";
}

export function getSessionClientLabel(session: ProfileSessionDto) {
  if (session.hasUserAgentMetadata) {
    return "Navegador identificado (armazenado como hash)";
  }

  return "Metadados de cliente indisponíveis";
}

export function getSessionLocationLabel(session: ProfileSessionDto) {
  if (session.hasIpMetadata) {
    return "Origem registrada (hash)";
  }

  return "Localização indisponível";
}

export function getSessionIpLabel(session: ProfileSessionDto) {
  if (session.hasIpMetadata) {
    return "Endereço IP protegido";
  }

  return "IP não registrado";
}

export function formatSessionActivity(session: ProfileSessionDto) {
  if (session.isCurrent) {
    return "Ativo agora";
  }

  const date = new Date(session.updatedAt);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Última atividade: agora";
  }

  if (diffMinutes < 60) {
    return `Última atividade: há ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Última atividade: há ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Última atividade: há ${diffDays}d`;
  }

  return `Última atividade: ${formatProfileDateTime(session.updatedAt)}`;
}
