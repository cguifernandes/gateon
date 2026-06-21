import { GateonApiError } from "./gateon-api.js";

const PERMISSION_LABELS: Record<string, string> = {
  canManageChat: "Gerenciar o chat",
  canRestrictMembers: "Banir usuários",
  canInviteUsers: "Convidar usuários via link",
  "send-messages": "Gerenciar o chat",
  "ban-users": "Banir usuários",
  "manage-invite-links": "Convidar usuários via link",
};

function formatPermissionList(ids: string[]): string {
  const labels = ids.map((id) => PERMISSION_LABELS[id] ?? id);
  if (labels.length === 0) {
    return "as permissões obrigatórias do painel";
  }
  if (labels.length === 1) {
    return labels[0] ?? "as permissões obrigatórias do painel";
  }
  if (labels.length === 2) {
    return `${labels[0]} e ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}`;
}

export type TelegramConnectionReplyContext = "connection" | "existing_group";

export function replyForTelegramConnectionReason(
  reason: string | undefined,
  missingIds: string[] | undefined,
  context: TelegramConnectionReplyContext = "connection",
): string | null {
  if (reason === "bot_must_be_administrator") {
    if (context === "existing_group") {
      return [
        "O bot não é administrador neste grupo.",
        "",
        "Para enviar alertas e automações, promova o Gateon em Configurações do grupo → Administradores e ative as permissões necessárias para publicar mensagens.",
      ].join("\n");
    }

    return [
      "Grupo identificado.",
      "",
      "Para concluir a conexão no Gateon, abra Configurações do grupo → Administradores, promova o bot a administrador e ative as permissões obrigatórias indicadas no painel (mesmos nomes do Telegram).",
    ].join("\n");
  }

  if (reason === "bot_missing_required_admin_rights") {
    const missing = missingIds?.filter(Boolean) ?? [];
    const permissions = formatPermissionList(missing);

    return [
      "O bot já está no grupo, mas ainda não tem todas as permissões necessárias.",
      "",
      `Em Administradores, edite o Gateon e ative: ${permissions}.`,
      "",
      "Depois de salvar, o painel atualiza automaticamente em alguns segundos.",
    ].join("\n");
  }

  return null;
}

export function replyForGateonApiError(error: unknown): string {
  if (!(error instanceof GateonApiError)) {
    return "Não foi possível concluir a operação. Tente novamente em instantes.";
  }

  const { status, apiMessage } = error;

  if (
    status === 409 &&
    apiMessage.includes("already linked to another Gateon user")
  ) {
    if (apiMessage.includes("Telegram group")) {
      return [
        "Este grupo do Telegram já está conectado a outra conta Gateon.",
        "",
        "Peça ao administrador da conta que já usa este grupo ou conecte um grupo diferente.",
      ].join("\n");
    }

    return [
      "Esta conta do Telegram já está vinculada a outro usuário Gateon.",
      "",
      "Entre no painel com a mesma conta Gateon que você usou antes ou use outro perfil do Telegram para conectar um novo grupo.",
    ].join("\n");
  }

  if (status === 401) {
    return [
      "Este link não corresponde à conta do Telegram que está tentando conectar.",
      "",
      "Gere um novo link em Grupos no painel Gateon e abra-o com o mesmo perfil do Telegram.",
    ].join("\n");
  }

  if (apiMessage.includes("Invalid Telegram connection token")) {
    return "Este link de conexão é inválido. Gere um novo link em Grupos no painel Gateon.";
  }

  if (apiMessage.includes("Telegram connection token expired")) {
    return "Este link de conexão expirou. Gere um novo link em Grupos no painel Gateon.";
  }

  if (apiMessage.includes("Telegram connection token already used")) {
    return "Este link de conexão já foi utilizado. Gere um novo link em Grupos no painel Gateon.";
  }

  if (apiMessage.includes("No active Telegram connection intent")) {
    return "Não há uma conexão em andamento para esta conta. Abra primeiro o link privado do bot e depois selecione o grupo.";
  }

  return "Não foi possível concluir a conexão. Gere um novo link em Grupos no painel Gateon e tente novamente.";
}
