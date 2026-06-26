export type StripeAutomationAlertRow = {
  id: string;
  triggerConfig: unknown;
};

export function isStripeAutomationTriggerType(
  triggerType: string | null | undefined,
): boolean {
  return typeof triggerType === 'string' && triggerType.startsWith('STRIPE_');
}

export function filterStripeAutomationAlerts(
  alerts: StripeAutomationAlertRow[],
  stripeConnectionId: string,
): StripeAutomationAlertRow[] {
  return alerts.filter((alert) => {
    const config = (alert.triggerConfig ?? {}) as {
      stripeConnectionId?: string;
    };
    if (!config.stripeConnectionId) return true;
    return config.stripeConnectionId === stripeConnectionId;
  });
}
