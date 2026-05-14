export function replyForTelegramConnectionReason(
  reason: string | undefined,
  missingIds: string[] | undefined,
): string | null {
  if (reason === "bot_must_be_administrator") {
    return "Grupo encontrado. Para concluir a conexao, promova o bot a administrador com as permissoes solicitadas no painel.";
  }
  if (reason === "bot_missing_required_admin_rights") {
    const suffix =
      missingIds && missingIds.length > 0
        ? ` Faltando: ${missingIds.join(", ")}.`
        : "";
    return `O bot precisa das permissoes obrigatorias do painel (enviar mensagens, banir usuarios, gerenciar convites).${suffix}`;
  }
  return null;
}
