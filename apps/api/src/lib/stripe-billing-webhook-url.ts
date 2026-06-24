import type { ConfigService } from '@nestjs/config';
import { resolveRequestPublicBaseUrl } from './request-public-base-url';
import { isLocalOnlyWebBaseUrl } from './stripe-checkout-redirect';

type HeaderReader = {
  get(name: string): string | null | undefined;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

export function resolveStripeWebhookPublicBaseUrl(
  config: Pick<ConfigService, 'get'>,
  requestHeaders?: HeaderReader,
): string {
  const explicit =
    config.get<string>('API_PUBLIC_BASE_URL')?.trim() ||
    config.get<string>('STRIPE_WEBHOOK_PUBLIC_BASE_URL')?.trim();

  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  if (requestHeaders) {
    const fromRequest = resolveRequestPublicBaseUrl(requestHeaders);
    if (fromRequest) {
      return fromRequest;
    }
  }

  const apiUrl = config.get<string>('API_URL')?.trim();
  if (apiUrl && !isLocalOnlyWebBaseUrl(apiUrl)) {
    return normalizeBaseUrl(apiUrl);
  }

  const nodeEnv = config.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
  if (nodeEnv !== 'production') {
    const port = config.get<string>('PORT') ?? '4000';
    return `http://localhost:${port}`;
  }

  const port = config.get<string>('PORT') ?? '4000';
  return `http://localhost:${port}`;
}

export function buildStripeWebhookEndpointUrl(
  config: Pick<ConfigService, 'get'>,
  connectionId: string,
  requestHeaders?: HeaderReader,
): string {
  return `${resolveStripeWebhookPublicBaseUrl(config, requestHeaders)}/stripe-billing/webhooks/${connectionId}`;
}
