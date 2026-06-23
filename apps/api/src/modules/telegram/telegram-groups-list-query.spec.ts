import { telegramGroupsListQuerySchema } from '../../lib/zod/telegram-groups-list-query-schemas';

describe('telegramGroupsListQuerySchema', () => {
  it('accepts stripe payer and connection filters', () => {
    const result = telegramGroupsListQuerySchema.safeParse({
      page: '1',
      pageSize: '10',
      view: 'members',
      stripePayer: 'payer',
      stripeConnectionIds: 'conn-1,conn-2',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stripePayer).toBe('payer');
      expect(result.data.stripeConnectionIds).toBe('conn-1,conn-2');
    }
  });

  it('defaults stripe payer to all', () => {
    const result = telegramGroupsListQuerySchema.safeParse({
      page: '1',
      pageSize: '10',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stripePayer).toBe('all');
    }
  });
});
