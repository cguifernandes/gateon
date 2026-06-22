import { filterStripeAutomationAlerts } from './stripe-automation-alerts';

describe('filterStripeAutomationAlerts', () => {
  const alerts = [
    { id: 'a1', triggerConfig: { stripeConnectionId: 'conn-zeus' } },
    { id: 'a2', triggerConfig: { stripeConnectionId: 'conn-other' } },
    { id: 'a3', triggerConfig: {} },
    { id: 'a4', triggerConfig: null },
  ];

  it('matches alerts bound to the same Stripe connection and legacy alerts', () => {
    const matched = filterStripeAutomationAlerts(alerts, 'conn-zeus');
    expect(matched.map((alert) => alert.id).sort()).toEqual(['a1', 'a3', 'a4']);
  });

  it('excludes alerts bound to a different connection', () => {
    const matched = filterStripeAutomationAlerts(alerts, 'conn-zeus');
    expect(matched.map((alert) => alert.id)).not.toContain('a2');
  });
});
