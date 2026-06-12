type StripePriceLabelInput = {
  nickname?: string | null;
  unit_amount?: number | null;
  currency?: string | null;
  recurring?: {
    interval?: string | null;
    interval_count?: number | null;
  } | null;
  product?: { name?: string | null } | string | null;
};

const intervalSuffix: Record<string, string> = {
  day: '/dia',
  week: '/semana',
  month: '/mês',
  year: '/ano',
};

export function formatStripePriceAmount(
  price: StripePriceLabelInput,
): string | null {
  if (price.unit_amount == null) {
    return null;
  }

  const currency = (price.currency ?? 'brl').toUpperCase();
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(price.unit_amount / 100);

  const interval = price.recurring?.interval ?? undefined;
  const suffix = interval ? (intervalSuffix[interval] ?? `/${interval}`) : '';

  return `${formatted}${suffix}`;
}

export function formatStripePlanLabel(price: StripePriceLabelInput): string {
  const productName =
    typeof price.product === 'object' ? price.product?.name?.trim() : null;
  const baseName = price.nickname?.trim() || productName || 'Plano';
  const priceAmount = formatStripePriceAmount(price);

  if (!priceAmount) {
    return baseName;
  }

  return `${baseName} — ${priceAmount}`;
}
