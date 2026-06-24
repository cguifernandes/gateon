import {
  canOpenStripeSubscriptionCancelPortal,
  isEntitledStripeSubscription,
  isManageableStripeSubscriptionForCancel,
  pickStripeSubscriptionForCancel,
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

  describe('isManageableStripeSubscriptionForCancel', () => {
    it('allows active and trialing subscriptions', () => {
      expect(isManageableStripeSubscriptionForCancel({ status: 'active' })).toBe(
        true,
      );
      expect(
        isManageableStripeSubscriptionForCancel({ status: 'trialing' }),
      ).toBe(true);
    });

    it('allows past_due subscriptions', () => {
      expect(
        isManageableStripeSubscriptionForCancel({ status: 'past_due' }),
      ).toBe(true);
    });

    it('rejects canceled subscriptions', () => {
      expect(
        isManageableStripeSubscriptionForCancel({ status: 'canceled' }),
      ).toBe(false);
    });

    it('allows unknown subscription rows while sync catches up', () => {
      expect(isManageableStripeSubscriptionForCancel(null)).toBe(true);
      expect(isManageableStripeSubscriptionForCancel(undefined)).toBe(true);
    });
  });

  describe('canOpenStripeSubscriptionCancelPortal', () => {
    it('allows portal when subscription sync has not run yet', () => {
      expect(canOpenStripeSubscriptionCancelPortal([])).toBe(true);
    });

    it('allows portal when customer has a new active subscription after cancel', () => {
      expect(
        canOpenStripeSubscriptionCancelPortal([
          { status: 'canceled' },
          { status: 'active' },
        ]),
      ).toBe(true);
    });

    it('blocks portal when every synced subscription is ended', () => {
      expect(
        canOpenStripeSubscriptionCancelPortal([{ status: 'canceled' }]),
      ).toBe(false);
    });
  });

  describe('pickStripeSubscriptionForCancel', () => {
    it('prefers the subscription linked after checkout', () => {
      expect(
        pickStripeSubscriptionForCancel(
          [
            {
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
              planName: 'Plano antigo',
            },
            {
              stripeSubscriptionId: 'sub_new',
              status: 'active',
              planName: 'Plano novo',
            },
          ],
          'sub_new',
        ),
      ).toEqual({
        stripeSubscriptionId: 'sub_new',
        status: 'active',
        planName: 'Plano novo',
      });
    });

    it('returns undefined when only ended subscriptions exist', () => {
      expect(
        pickStripeSubscriptionForCancel([{ status: 'canceled' }], 'sub_old'),
      ).toBeUndefined();
    });
  });
});
