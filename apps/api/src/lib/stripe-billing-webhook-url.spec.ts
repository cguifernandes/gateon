import type { ConfigService } from '@nestjs/config';
import {
  buildStripeWebhookEndpointUrl,
  resolveStripeWebhookPublicBaseUrl,
} from './stripe-billing-webhook-url';

function createConfig(
  values: Record<string, string | undefined>,
): Pick<ConfigService, 'get'> {
  return {
    get: (key: string) => values[key],
  };
}

describe('resolveStripeWebhookPublicBaseUrl', () => {
  it('prefers API_PUBLIC_BASE_URL', () => {
    const config = createConfig({
      API_PUBLIC_BASE_URL: 'https://api.gateon.com/',
      NODE_ENV: 'production',
      PORT: '4000',
    });

    expect(resolveStripeWebhookPublicBaseUrl(config)).toBe(
      'https://api.gateon.com',
    );
  });

  it('uses x-gateon-api-public-base-url when env is missing', () => {
    const config = createConfig({
      NODE_ENV: 'production',
      PORT: '4000',
    });

    expect(
      resolveStripeWebhookPublicBaseUrl(config, {
        get: (name) =>
          name === 'x-gateon-api-public-base-url'
            ? 'https://gateon-api.onrender.com'
            : null,
      }),
    ).toBe('https://gateon-api.onrender.com');
  });

  it('falls back to localhost only outside production', () => {
    const config = createConfig({
      NODE_ENV: 'development',
      PORT: '4000',
    });

    expect(resolveStripeWebhookPublicBaseUrl(config)).toBe(
      'http://localhost:4000',
    );
  });
});

describe('buildStripeWebhookEndpointUrl', () => {
  it('builds the per-connection webhook path', () => {
    const config = createConfig({
      API_PUBLIC_BASE_URL: 'https://api.test',
    });

    expect(buildStripeWebhookEndpointUrl(config, 'conn-1')).toBe(
      'https://api.test/stripe-billing/webhooks/conn-1',
    );
  });
});
