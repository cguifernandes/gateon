import {
  isEntitledStripeSubscription,
  shouldRevokeStripeTelegramMemberLink,
} from './stripe-telegram-member-links';

describe('stripe telegram member links', () => {
  describe('isEntitledStripeSubscription', () => {
    it('returns true for active subscriptions', () => {
      expect(isEntitledStripeSubscription({ status: 'active' })).toBe(true);
    });

    it('returns true for trialing subscriptions', () => {
      expect(isEntitledStripeSubscription({ status: 'trialing' })).toBe(true);
    });

    it('returns false for canceled subscriptions', () => {
      expect(isEntitledStripeSubscription({ status: 'canceled' })).toBe(false);
    });

    it('returns false when subscription is missing', () => {
      expect(isEntitledStripeSubscription(null)).toBe(false);
    });
  });

  describe('shouldRevokeStripeTelegramMemberLink', () => {
    it('revokes canceled subscriptions', () => {
      expect(shouldRevokeStripeTelegramMemberLink('canceled')).toBe(true);
    });

    it('keeps active subscriptions', () => {
      expect(shouldRevokeStripeTelegramMemberLink('active')).toBe(false);
    });

    it('keeps trialing subscriptions', () => {
      expect(shouldRevokeStripeTelegramMemberLink('trialing')).toBe(false);
    });
  });
});
