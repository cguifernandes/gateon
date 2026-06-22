import type { ConfigService } from '@nestjs/config';

export function resolveStripeWebhookPublicBaseUrl(
  config: Pick<ConfigService, 'get'>,
): string {
  const explicit =
    config.get<string>('API_PUBLIC_BASE_URL')?.trim() ||
    config.get<string>('STRIPE_WEBHOOK_PUBLIC_BASE_URL')?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const port = config.get<string>('PORT') ?? '4000';
  return `http://localhost:${port}`;
}

export function buildStripeWebhookEndpointUrl(
  config: Pick<ConfigService, 'get'>,
  connectionId: string,
): string {
  return `${resolveStripeWebhookPublicBaseUrl(config)}/stripe-billing/webhooks/${connectionId}`;
}
