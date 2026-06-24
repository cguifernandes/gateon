import { telegramSubscriptionCancelPortalSchema } from '../../lib/zod/telegram-subscription-schemas';

describe('telegramSubscriptionCancelPortalSchema', () => {
  it('accepts telegram user id', () => {
    const result = telegramSubscriptionCancelPortalSchema.safeParse({
      telegramUserId: '123456789',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty telegram user id', () => {
    const result = telegramSubscriptionCancelPortalSchema.safeParse({
      telegramUserId: '',
    });
    expect(result.success).toBe(false);
  });
});
