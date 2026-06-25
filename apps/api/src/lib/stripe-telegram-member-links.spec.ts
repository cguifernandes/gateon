import {
  canOpenStripeSubscriptionCancelPortal,
  isEntitledStripeSubscription,
  isManageableStripeSubscriptionForCancel,
  isStripeSubscriptionCancelScheduled,
  memberHasStripeCancelScheduled,
  pickStripeSubscriptionForCancel,
  resolveStripePayerSubscriptionForLink,
  shouldRevokeStripeTelegramMemberLink,
  shouldRevokeStripeTelegramMemberLinkForSubscription,
  showsStripePayerBadge,
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

  describe('showsStripePayerBadge', () => {
    it('shows badge for active subscriptions', () => {
      expect(
        showsStripePayerBadge({ status: 'active', cancelAtPeriodEnd: false }),
      ).toBe(true);
    });

    it('shows badge when cancel is scheduled at period end', () => {
      expect(
        showsStripePayerBadge({ status: 'active', cancelAtPeriodEnd: true }),
      ).toBe(true);
    });

    it('hides badge for canceled subscriptions', () => {
      expect(showsStripePayerBadge({ status: 'canceled' })).toBe(false);
    });
  });

  describe('isStripeSubscriptionCancelScheduled', () => {
    it('detects active subscriptions scheduled to cancel', () => {
      expect(
        isStripeSubscriptionCancelScheduled({
          status: 'active',
          cancelAtPeriodEnd: true,
        }),
      ).toBe(true);
    });

    it('ignores active subscriptions without scheduled cancel', () => {
      expect(
        isStripeSubscriptionCancelScheduled({
          status: 'active',
          cancelAtPeriodEnd: false,
        }),
      ).toBe(false);
    });
  });

  describe('memberHasStripeCancelScheduled', () => {
    it('returns true when any linked plan is scheduled to cancel', () => {
      expect(
        memberHasStripeCancelScheduled([
          { cancelAtPeriodEnd: false },
          { cancelAtPeriodEnd: true },
        ]),
      ).toBe(true);
    });
  });

  describe('shouldRevokeStripeTelegramMemberLinkForSubscription', () => {
    it('revokes canceled subscriptions', () => {
      expect(
        shouldRevokeStripeTelegramMemberLinkForSubscription({
          status: 'canceled',
        }),
      ).toBe(true);
    });

    it('keeps active subscriptions even when cancel is scheduled', () => {
      expect(
        shouldRevokeStripeTelegramMemberLinkForSubscription({
          status: 'active',
          cancelAtPeriodEnd: true,
        }),
      ).toBe(false);
    });

    it('keeps active subscriptions without scheduled cancel', () => {
      expect(
        shouldRevokeStripeTelegramMemberLinkForSubscription({
          status: 'active',
          cancelAtPeriodEnd: false,
        }),
      ).toBe(false);
    });
  });

  describe('resolveStripePayerSubscriptionForLink', () => {
    it('hides canceled subscription linked to the member', () => {
      expect(
        resolveStripePayerSubscriptionForLink(
          {
            connectionId: 'conn_1',
            stripeCustomerId: 'cus_1',
            stripeSubscriptionId: 'sub_old',
          },
          [
            {
              connectionId: 'conn_1',
              stripeCustomerId: 'cus_1',
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
            },
          ],
        ),
      ).toBeNull();
    });

    it('shows a newer active subscription after re-subscribe', () => {
      expect(
        resolveStripePayerSubscriptionForLink(
          {
            connectionId: 'conn_1',
            stripeCustomerId: 'cus_1',
            stripeSubscriptionId: 'sub_old',
          },
          [
            {
              connectionId: 'conn_1',
              stripeCustomerId: 'cus_1',
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
            },
            {
              connectionId: 'conn_1',
              stripeCustomerId: 'cus_1',
              stripeSubscriptionId: 'sub_new',
              status: 'active',
            },
          ],
        ),
      ).toEqual({
        connectionId: 'conn_1',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_new',
        status: 'active',
      });
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

    it('allows portal when active link points to a subscription not synced yet', () => {
      expect(
        canOpenStripeSubscriptionCancelPortal(
          [
            {
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
            },
          ],
          {
            status: 'ACTIVE',
            stripeSubscriptionId: 'sub_new',
          },
        ),
      ).toBe(true);
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
