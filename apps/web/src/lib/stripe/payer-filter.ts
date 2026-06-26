export type StripePayerFilterValue =
  | "all"
  | "payer"
  | "non_payer"
  | "cancel_scheduled";

export const STRIPE_PAYER_FILTER_OPTIONS: {
  value: StripePayerFilterValue;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: "payer", label: "Pagantes Stripe" },
  {
    value: "cancel_scheduled",
    label: "Cancelamento agendado",
  },
  { value: "non_payer", label: "Não pagantes" },
];
