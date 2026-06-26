type StripePlanLabelSource = {
  monitoredPlanLabel?: string | null;
  monitoredStripePriceId?: string | null;
};

export function getStripePlanLabel(source: StripePlanLabelSource): string {
  return (
    source.monitoredPlanLabel?.trim() ||
    source.monitoredStripePriceId?.trim() ||
    "Plano Stripe"
  );
}
