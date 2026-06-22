import {
  isLocalOnlyWebBaseUrl,
  resolveStripeCheckoutRedirectUrls,
} from './stripe-checkout-redirect';

describe('isLocalOnlyWebBaseUrl', () => {
  it('detects localhost hosts', () => {
    expect(isLocalOnlyWebBaseUrl('http://localhost:3000')).toBe(true);
    expect(isLocalOnlyWebBaseUrl('http://127.0.0.1:3000')).toBe(true);
  });

  it('accepts public hosts', () => {
    expect(isLocalOnlyWebBaseUrl('https://abc.ngrok-free.app')).toBe(false);
    expect(isLocalOnlyWebBaseUrl('https://app.gateon.com')).toBe(false);
  });
});

describe('resolveStripeCheckoutRedirectUrls', () => {
  const botUrl = 'https://t.me/GateonBot';

  it('uses public override for mobile local testing', () => {
    const result = resolveStripeCheckoutRedirectUrls({
      webBaseUrl: 'http://localhost:3000',
      publicBaseUrl: 'https://abc.ngrok-free.app',
      telegramBotPublicUrl: botUrl,
      isProduction: false,
    });

    expect(result.mode).toBe('public_web');
    expect(result.successUrl).toContain(
      'abc.ngrok-free.app/stripe/checkout/success',
    );
    expect(result.shouldAutoReconcile).toBe(false);
  });

  it('falls back to Telegram and auto-reconcile in local development', () => {
    const result = resolveStripeCheckoutRedirectUrls({
      webBaseUrl: 'http://localhost:3000',
      telegramBotPublicUrl: botUrl,
      isProduction: false,
    });

    expect(result.mode).toBe('telegram_fallback');
    expect(result.successUrl).toBe(botUrl);
    expect(result.cancelUrl).toBe(botUrl);
    expect(result.shouldAutoReconcile).toBe(true);
  });

  it('keeps web URLs in production even when base is localhost', () => {
    const result = resolveStripeCheckoutRedirectUrls({
      webBaseUrl: 'http://localhost:3000',
      telegramBotPublicUrl: botUrl,
      isProduction: true,
    });

    expect(result.mode).toBe('local_web');
    expect(result.successUrl).toContain(
      'localhost:3000/stripe/checkout/success',
    );
    expect(result.shouldAutoReconcile).toBe(false);
  });
});
