import { telegramGroupsListQuerySchema } from '../../lib/zod/telegram-groups-list-query-schemas';
import { telegramSubscriptionCancelPortalSchema } from '../../lib/zod/telegram-subscription-schemas';
import {
  isTelegramMemberGoneStatus,
  isTelegramMemberLookupGoneError,
} from '../../lib/telegram/member-presence';
import { TelegramService } from './telegram.service';

describe('telegram member presence', () => {
  describe('isTelegramMemberGoneStatus', () => {
    it('detects left and kicked statuses', () => {
      expect(isTelegramMemberGoneStatus('left')).toBe(true);
      expect(isTelegramMemberGoneStatus('kicked')).toBe(true);
    });

    it('keeps active membership statuses', () => {
      expect(isTelegramMemberGoneStatus('member')).toBe(false);
      expect(isTelegramMemberGoneStatus('administrator')).toBe(false);
      expect(isTelegramMemberGoneStatus('creator')).toBe(false);
    });
  });

  describe('isTelegramMemberLookupGoneError', () => {
    it('detects Telegram lookup errors for missing participants', () => {
      expect(
        isTelegramMemberLookupGoneError('Bad Request: user not found'),
      ).toBe(true);
      expect(
        isTelegramMemberLookupGoneError('Bad Request: USER_NOT_PARTICIPANT'),
      ).toBe(true);
    });
  });
});

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

describe('TelegramService', () => {
  describe('listGroupOptions', () => {
    const findMany = jest.fn();
    const groupBy = jest.fn();
    const getMaxManagedMembersPerGroup = jest.fn();

    function createService() {
      return new TelegramService(
        {
          telegramGroups: { findMany },
          telegramGroupMembers: { groupBy },
        } as never,
        { get: jest.fn() } as never,
        { getMaxManagedMembersPerGroup } as never,
        { ensureForGroup: jest.fn() } as never,
      );
    }

    beforeEach(() => {
      findMany.mockReset();
      groupBy.mockReset();
      getMaxManagedMembersPerGroup.mockReset();
      getMaxManagedMembersPerGroup.mockResolvedValue(100);
    });

    it('returns lightweight group options without member payloads', async () => {
      findMany.mockResolvedValue([
        {
          id: 'group-1',
          telegramChatId: '  -1001 ',
          title: 'Grupo VIP',
          chatPhotoFileId: 'photo-1',
          type: 'supergroup',
          isForum: true,
          botStatus: 'administrator',
          connectedAt: new Date('2026-06-21T12:00:00.000Z'),
          updatedAt: new Date('2026-06-22T12:00:00.000Z'),
          _count: { members: 12 },
        },
      ]);
      groupBy.mockResolvedValue([
        { telegramGroupId: 'group-1', _count: { _all: 3 } },
      ]);

      const result = await createService().listGroupOptions('user-1');

      const findManyArgs = findMany.mock.calls[0]?.[0];
      expect(findManyArgs).toEqual({
        where: { userId: 'user-1' },
        orderBy: { connectedAt: 'desc' },
        select: expect.objectContaining({
          id: true,
          telegramChatId: true,
          title: true,
        }),
      });
      expect(findManyArgs.select.members).toBeUndefined();
      expect(result.groups).toEqual([
        expect.objectContaining({
          id: 'group-1',
          telegramChatId: '-1001',
          chatPhotoUrl: '/api/telegram/groups/group-1/chat-photo',
          memberCount: 12,
          trackedMemberCount: 12,
          leftMemberCount: 3,
          members: [],
          linkedStripePlans: [],
        }),
      ]);
    });
  });
});
