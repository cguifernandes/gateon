export function buildStartWithoutTokenMessage(): string {
  return [
    "Olá! Sou o bot do Gateon.",
    "",
    "Para vincular um grupo ao seu painel, abra o cadastro no site e use o link seguro que o assistente gera. Esse link já traz o código certo — não use /start aqui sem ele.",
    "",
    "Quer ver o passo a passo e o que o bot faz? Envie /help.",
  ].join("\n");
}

export function buildHelpMessage(chatType: string | undefined): string {
  if (chatType === "group" || chatType === "supergroup") {
    return [
      "Ajuda do Gateon (grupo)",
      "",
      "Este bot controla acesso com base em assinaturas configuradas no painel web.",
      "",
      "Para conectar este grupo:",
      "1. No painel, inicie o cadastro do grupo e abra o link no Telegram.",
      "2. Confirme no chat privado com o bot.",
      "3. Adicione o bot aqui como administrador, com as permissões indicadas no painel.",
      "",
      "Dúvidas sobre o fluxo completo? Peça a um administrador para abrir o painel ou envie /help no chat privado com o bot.",
      "",
      "Assinantes podem enviar /cancelar no PV do bot para gerenciar ou cancelar o plano na Stripe.",
    ].join("\n");
  }

  return [
    "Ajuda do Gateon",
    "",
    "O Gateon automatiza entrada e saída em grupos pagos do Telegram, conforme o status da assinatura no gateway conectado no painel.",
    "",
    "Como conectar um grupo:",
    "1. Entre no painel web do Gateon e inicie o cadastro do grupo.",
    "2. Abra o link seguro que o assistente mostrar (ele abre este chat com o código certo).",
    "3. Toque em \"Selecionar grupo\" e escolha o grupo no Telegram.",
    "4. Promova o bot a administrador com as permissões obrigatórias do painel.",
    "",
    "Comandos:",
    "• /start — use só com o link do painel (não digite /start vazio).",
    "• /cancelar — abre o portal da Stripe para cancelar ou gerenciar sua assinatura (somente no chat privado, após ter assinado por este bot).",
    "• /help — mostra esta mensagem.",
    "",
    "Se algo falhar, confira as mensagens do bot no grupo e tente um novo cadastro no painel.",
  ].join("\n");
}
