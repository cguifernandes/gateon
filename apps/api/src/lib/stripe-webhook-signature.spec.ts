import { createHmac } from 'node:crypto';
import { verifyStripeWebhookSignature } from './stripe-webhook-signature';

function signPayload(secret: string, payload: string, timestamp: number) {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('verifyStripeWebhookSignature', () => {
  const secret = 'whsec_test_secret';
  const payload = '{"id":"evt_test"}';

  it('accepts a valid signature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = signPayload(secret, payload, timestamp);

    expect(
      verifyStripeWebhookSignature(payload, header, secret),
    ).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v1=deadbeef`;

    expect(
      verifyStripeWebhookSignature(payload, header, secret),
    ).toBe(false);
  });
});
