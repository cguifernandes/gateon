import type { MemberActionTarget } from "@/lib/members/actions";
import { getMemberDisplayName, getMemberInitials } from "@/lib/members/display";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

export type MemberSummary = TelegramGroupSummaryDto["members"][number];

export type VisibleGroup = TelegramGroupSummaryDto & {
  visibleMembers: MemberSummary[];
};

export { getMemberDisplayName, getMemberInitials };

export function getMemberKey(groupId: string, telegramUserId: string) {
  return `${groupId}:${telegramUserId}`;
}

export function getMemberKeyGroupId(memberKey: string) {
  return memberKey.split(":")[0] ?? "";
}

export function formatMemberDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isMemberLeft(member: MemberSummary) {
  return member.status === "left";
}

export function sortMembersActiveFirst(members: MemberSummary[]) {
  return [...members].sort((a, b) => {
    const aLeft = isMemberLeft(a) ? 1 : 0;
    const bLeft = isMemberLeft(b) ? 1 : 0;
    return aLeft - bLeft;
  });
}

export function isMemberOwner(member: MemberSummary) {
  return member.isOwner;
}

export function isStripePayer(member: MemberSummary) {
  return member.linkedStripePlans.length > 0;
}

export function isStripeCancelScheduled(member: MemberSummary) {
  return member.linkedStripePlans.some((plan) => plan.cancelAtPeriodEnd);
}

export function isMemberRemovable(member: MemberSummary) {
  return member.status === "active" && !member.isOwner;
}

function normalizeSearchValue(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

export function memberMatchesSearch(member: MemberSummary, query: string) {
  const haystack = [member.firstName, member.lastName, member.telegramUserId]
    .map(normalizeSearchValue)
    .join(" ");

  return haystack.includes(query);
}

export function groupMatchesSearch(
  group: TelegramGroupSummaryDto,
  query: string,
) {
  const haystack = [group.title, group.telegramChatId]
    .map(normalizeSearchValue)
    .join(" ");

  return haystack.includes(query);
}

export function getGroupMemberKeys(group: TelegramGroupSummaryDto) {
  return group.members.map((member) =>
    getMemberKey(group.id, member.telegramUserId),
  );
}

export type SelectedMemberTarget = MemberActionTarget;

export type VisibleSelectionSummary = {
  count: number;
  targets: SelectedMemberTarget[];
  telegramUserIds: string[];
  hasActiveMember: boolean;
  hasRemovableMember: boolean;
};

export function getVisibleSelectionSummary(
  visibleGroups: VisibleGroup[],
  selectedGroupIds: Set<string>,
  selectedMemberKeys: Set<string>,
): VisibleSelectionSummary {
  const targets: SelectedMemberTarget[] = [];
  let hasActiveMember = false;
  let hasRemovableMember = false;
  let count = 0;

  for (const group of visibleGroups) {
    if (selectedGroupIds.has(group.id)) {
      const groupCount = getGroupMemberListCount(group);
      count += groupCount;
      targets.push({
        groupId: group.id,
        selectAllInGroup: true,
      });
      if (group.trackedMemberCount > 0) {
        hasActiveMember = true;
        hasRemovableMember = true;
      }
      continue;
    }

    const members = group.visibleMembers.filter((member) =>
      selectedMemberKeys.has(getMemberKey(group.id, member.telegramUserId)),
    );

    for (const member of members) {
      count += 1;
      targets.push({
        groupId: group.id,
        telegramUserId: member.telegramUserId,
        status: member.status,
        isOwner: member.isOwner,
      });
      if (member.status === "active") {
        hasActiveMember = true;
        if (!member.isOwner) {
          hasRemovableMember = true;
        }
      }
    }
  }

  return {
    count,
    targets,
    telegramUserIds: targets
      .map((target) => target.telegramUserId)
      .filter((value): value is string => Boolean(value)),
    hasActiveMember,
    hasRemovableMember,
  };
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatGroupMemberStatusSummary(group: {
  trackedMemberCount: number;
  leftMemberCount: number;
}) {
  return `${formatCountLabel(group.trackedMemberCount, "ativo", "ativos")} / ${formatCountLabel(group.leftMemberCount, "inativo", "inativos")}`;
}

export function getGroupMemberSelectionFingerprint(
  groupId: string,
  selectedMemberKeys: ReadonlySet<string>,
): string {
  const prefix = `${groupId}:`;
  const keys: string[] = [];

  for (const key of selectedMemberKeys) {
    if (key.startsWith(prefix)) {
      keys.push(key);
    }
  }

  return keys.sort().join(",");
}

export function getGroupMemberListCount(group: TelegramGroupSummaryDto) {
  return (
    group.membersPagination?.totalItems ??
    group.trackedMemberCount + group.leftMemberCount
  );
}
