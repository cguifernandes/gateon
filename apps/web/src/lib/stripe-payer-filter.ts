export type StripePayerFilterValue = "all" | "payer" | "non_payer";

export const STRIPE_PAYER_FILTER_OPTIONS: {
  value: StripePayerFilterValue;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: "payer", label: "Pagantes Stripe" },
  { value: "non_payer", label: "Não pagantes" },
];
