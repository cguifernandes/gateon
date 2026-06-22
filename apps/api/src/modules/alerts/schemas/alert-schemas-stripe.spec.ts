import {
  alertUpsertSchema,
  isStripeAutomationTriggerType,
} from './alert-schemas';

const stripeTriggers = [
  'STRIPE_PAYMENT_SUCCEEDED',
  'STRIPE_PAYMENT_FAILED',
  'STRIPE_SUBSCRIPTION_EXPIRING',
  'STRIPE_SUBSCRIPTION_EXPIRED',
  'STRIPE_SUBSCRIPTION_RENEWED',
  'STRIPE_SUBSCRIPTION_CANCELED',
] as const;

const baseStripeAutomation = {
  name: 'Zeus pagamento',
  destinationType: 'AUTOMATION' as const,
  content: { body: 'Mensagem automática Stripe' },
  triggerConfig: {
    targetTelegramGroupIds: ['group-zeus'],
    stripeConnectionId: 'conn-zeus-basico',
  },
};

describe('isStripeAutomationTriggerType', () => {
  it.each(stripeTriggers)('recognizes %s as Stripe automation', (trigger) => {
    expect(isStripeAutomationTriggerType(trigger)).toBe(true);
  });

  it('rejects Telegram member triggers', () => {
    expect(isStripeAutomationTriggerType('MEMBER_JOINED')).toBe(false);
    expect(isStripeAutomationTriggerType(null)).toBe(false);
  });
});

describe('alertUpsertSchema — Stripe automations', () => {
  it.each(stripeTriggers)(
    'accepts valid AUTOMATION alert for %s',
    (triggerType) => {
      const result = alertUpsertSchema.safeParse({
        ...baseStripeAutomation,
        triggerType,
      });
      expect(result.success).toBe(true);
    },
  );

  it('rejects Stripe automation without stripeConnectionId', () => {
    const result = alertUpsertSchema.safeParse({
      ...baseStripeAutomation,
      triggerType: 'STRIPE_PAYMENT_SUCCEEDED',
      triggerConfig: { targetTelegramGroupIds: ['group-zeus'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('triggerConfig.stripeConnectionId');
    }
  });

  it('rejects Stripe automation without monitored groups', () => {
    const result = alertUpsertSchema.safeParse({
      ...baseStripeAutomation,
      triggerType: 'STRIPE_SUBSCRIPTION_EXPIRING',
      triggerConfig: { stripeConnectionId: 'conn-zeus-basico' },
    });
    expect(result.success).toBe(false);
  });
});
