const CHECKOUT_SESSION_ID_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';

export function isLocalOnlyWebBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.localhost')
    );
  } catch {
    return true;
  }
}

export function normalizeWebBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

export type StripeCheckoutRedirectUrls = {
  successUrl: string;
  cancelUrl: string;
  /** When true, poll Stripe after checkout because success page may not run (e.g. mobile + localhost). */
  shouldAutoReconcile: boolean;
  mode: 'public_web' | 'telegram_fallback' | 'local_web';
};

export function resolveStripeCheckoutRedirectUrls(input: {
  webBaseUrl: string;
  publicBaseUrl?: string | null;
  telegramBotPublicUrl: string;
  isProduction: boolean;
}): StripeCheckoutRedirectUrls {
  const webBase = normalizeWebBaseUrl(input.webBaseUrl);
  const publicBase = input.publicBaseUrl
    ? normalizeWebBaseUrl(input.publicBaseUrl)
    : null;

  if (publicBase && !isLocalOnlyWebBaseUrl(publicBase)) {
    return buildWebCheckoutUrls(publicBase, 'public_web', false);
  }

  if (!isLocalOnlyWebBaseUrl(webBase)) {
    return buildWebCheckoutUrls(webBase, 'public_web', false);
  }

  if (input.isProduction) {
    return buildWebCheckoutUrls(webBase, 'local_web', false);
  }

  const botUrl = input.telegramBotPublicUrl.trim();
  return {
    successUrl: botUrl,
    cancelUrl: botUrl,
    shouldAutoReconcile: true,
    mode: 'telegram_fallback',
  };
}

function buildWebCheckoutUrls(
  base: string,
  mode: StripeCheckoutRedirectUrls['mode'],
  shouldAutoReconcile: boolean,
): StripeCheckoutRedirectUrls {
  return {
    successUrl: `${base}/stripe/checkout/success?session_id=${CHECKOUT_SESSION_ID_PLACEHOLDER}`,
    cancelUrl: `${base}/stripe/checkout/cancel`,
    shouldAutoReconcile,
    mode,
  };
}
