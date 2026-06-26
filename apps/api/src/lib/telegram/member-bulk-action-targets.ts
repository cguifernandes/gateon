import type { Prisma, PrismaClient } from '@prisma/client';

export const BULK_MEMBER_ACTION_BATCH_SIZE = 25;

export type MemberBulkSelectionScope =
  | 'active_removable'
  | 'active'
  | 'all_tracked';

export function chunkValues<T>(values: T[], size: number): T[][] {
  if (values.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function buildMemberBulkSelectionWhere(
  groupId: string,
  scope: MemberBulkSelectionScope,
): Prisma.TelegramGroupMembersWhereInput {
  const where: Prisma.TelegramGroupMembersWhereInput = {
    telegramGroupId: groupId,
  };

  if (scope === 'active_removable') {
    where.leftAt = null;
    where.isOwner = false;
  } else if (scope === 'active') {
    where.leftAt = null;
  }

  return where;
}

export async function resolveMemberBulkActionUserIds(
  prisma: Pick<PrismaClient, 'telegramGroupMembers'>,
  groupId: string,
  scope: MemberBulkSelectionScope,
): Promise<string[]> {
  const members = await prisma.telegramGroupMembers.findMany({
    where: buildMemberBulkSelectionWhere(groupId, scope),
    select: { telegramUserId: true },
    orderBy: { updatedAt: 'desc' },
  });

  return members.map((member) => member.telegramUserId);
}
