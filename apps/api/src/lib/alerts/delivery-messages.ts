export const ALERT_DELIVERY_BOT_NOT_ADMIN_MESSAGE =
  'O bot precisa ser administrador do grupo com permissão para enviar mensagens.';

export const ALERT_DELIVERY_NO_TARGETS_MESSAGE =
  'Este alerta não tem destinatários configurados para envio.';

export function getAlertGroupDeliveryBlockReason(
  botStatus: string | null | undefined,
): string | null {
  const status = botStatus?.trim().toLowerCase() ?? '';
  if (status !== 'administrator' && status !== 'creator') {
    return ALERT_DELIVERY_BOT_NOT_ADMIN_MESSAGE;
  }
  return null;
}
