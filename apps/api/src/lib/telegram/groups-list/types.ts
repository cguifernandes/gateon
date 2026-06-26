import type { Prisma, PrismaClient } from '@prisma/client';
import type { LinkedStripePlanSummary } from '../../stripe/telegram-member-links';

export const MEMBER_PREVIEW_LIMIT = 50;
export const MEMBERS_PER_GROUP_PAGE_SIZE_DEFAULT = 25;
export const MEMBERS_PER_GROUP_PAGE_SIZE_MAX = 75;

export type TelegramGroupsListPrisma = Pick<
  PrismaClient,
  'telegramGroups' | 'stripeBillingConnections' | 'telegramGroupMembers'
>;

export type TrackedMemberRow = {
  telegramUserId: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoFileId: string | null;
  isOwner: boolean;
  joinedAt: Date;
  leftAt: Date | null;
};

export type GroupRow = {
  id: string;
  telegramChatId: string;
  title: string | null;
  chatPhotoFileId: string | null;
  type: string;
  isForum: boolean;
  botStatus: string;
  connectedAt: Date;
  updatedAt: Date;
  members: TrackedMemberRow[];
  _count: {
    members: number;
  };
};

export type GroupsListDeps = {
  prisma: TelegramGroupsListPrisma;
  getTelegramChatMemberCount: (
    telegramChatId: string,
  ) => Promise<number | null>;
  mapTrackedMemberToDto: (
    groupId: string,
    member: TrackedMemberRow,
  ) => {
    telegramUserId: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
    joinedAt: string;
    leftAt: string | null;
    status: 'active' | 'left';
    isOwner: boolean;
    linkedStripePlans: LinkedStripePlanSummary[];
  };
  withMemberStripePayerPlans: (
    groupId: string,
    member: ReturnType<GroupsListDeps['mapTrackedMemberToDto']>,
    plansByMemberKey: Map<string, LinkedStripePlanSummary[]>,
  ) => ReturnType<GroupsListDeps['mapTrackedMemberToDto']>;
  buildStripePayerPlansByMemberKey: (
    userId: string,
    groupIds: string[],
  ) => Promise<Map<string, LinkedStripePlanSummary[]>>;
  trackedMemberLimitPerGroup: number;
};

export const groupSelect = {
  id: true,
  telegramChatId: true,
  title: true,
  chatPhotoFileId: true,
  type: true,
  isForum: true,
  botStatus: true,
  connectedAt: true,
  updatedAt: true,
  _count: {
    select: {
      members: { where: { leftAt: null } },
    },
  },
} satisfies Prisma.TelegramGroupsSelect;
