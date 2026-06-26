import type { IncomingHttpHeaders } from 'node:http';
import type { ConfigService } from '@nestjs/config';
import { resolveRequestPublicBaseUrl } from '../http/request-public-base-url';
import { isLocalOnlyWebBaseUrl } from './checkout-redirect';
import { normalizeBaseUrl } from '../url/normalize-base-url';

export function resolveStripeWebhookPublicBaseUrl(
  config: Pick<ConfigService, 'get'>,
  requestHeaders?: IncomingHttpHeaders,
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
  requestHeaders?: IncomingHttpHeaders,
): string {
  return `${resolveStripeWebhookPublicBaseUrl(config, requestHeaders)}/stripe-billing/webhooks/${connectionId}`;
}
