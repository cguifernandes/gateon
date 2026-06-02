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
