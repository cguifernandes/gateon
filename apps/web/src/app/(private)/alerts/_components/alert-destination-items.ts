import type { AvatarStackItem } from "@/components/avatar-stack";
import { withCacheBuster } from "@/lib/utils";
import {
  type AlertSummaryDto,
  getAlertTargetGroupIds,
} from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type TelegramGroupChatMember = TelegramGroupSummaryDto["members"][number];

function formatMemberName(member: {
  firstName: string | null;
  lastName: string | null;
  telegramUserId: string;
}) {
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || member.telegramUserId;
}

function findMemberInGroups(
  telegramUserId: string,
  groups: TelegramGroupSummaryDto[],
): TelegramGroupChatMember | null {
  for (const group of groups) {
    const member = group.members.find(
      (item) => item.telegramUserId === telegramUserId,
    );
    if (member) return member;
  }
  return null;
}

function getTargetThreadIds(alert: AlertSummaryDto) {
  const config = alert.triggerConfig as
    | { targetMessageThreadIds?: number[] }
    | null
    | undefined;
  const fromConfig = config?.targetMessageThreadIds ?? [];
  if (fromConfig.length > 0) return fromConfig;
  return alert.messageThreadId ? [alert.messageThreadId] : [];
}

export function buildDestinationItems(
  alert: AlertSummaryDto,
  groups: TelegramGroupSummaryDto[],
): AvatarStackItem[] {
  const items: AvatarStackItem[] = [];
  const groupIds = getAlertTargetGroupIds(alert);
  const relatedGroups = groupIds
    .map((groupId) => groups.find((group) => group.id === groupId))
    .filter((group): group is TelegramGroupSummaryDto => Boolean(group));

  const memberIds = (alert.targets ?? []).map(
    (target) => target.telegramUserId,
  );
  const members = memberIds
    .map((telegramUserId) => findMemberInGroups(telegramUserId, groups))
    .filter((member): member is TelegramGroupChatMember => Boolean(member));

  const threadIds = getTargetThreadIds(alert);
  const showGroups =
    relatedGroups.length > 0 &&
    (alert.destinationType === "GROUP" ||
      alert.destinationType === "AUTOMATION" ||
      alert.destinationType === "QUICK_ALERT");

  if (showGroups) {
    for (const group of relatedGroups) {
      const title = group.title?.trim() || group.telegramChatId;
      items.push({
        id: `group-${group.id}`,
        name: title,
        tooltip: title,
        imageSrc: group.chatPhotoUrl
          ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
          : null,
        imageAlt: title,
        kind: "group",
      });
    }
  }

  if (memberIds.length > 0) {
    const memberEntries =
      members.length > 0
        ? members
        : memberIds.map((telegramUserId) => ({
            telegramUserId,
            firstName: null,
            lastName: null,
            profilePhotoUrl: null,
          }));

    for (const member of memberEntries) {
      const name = formatMemberName(member);
      items.push({
        id: `member-${member.telegramUserId}`,
        name,
        tooltip: name,
        imageSrc: member.profilePhotoUrl,
        imageAlt: name,
        kind: "member",
      });
    }
  }

  if (threadIds.length > 0 && alert.destinationType === "TOPIC") {
    const primaryGroup = relatedGroups[0];

    for (const threadId of threadIds) {
      const topicLabel = `Tópico #${threadId}`;
      const groupTitle =
        primaryGroup?.title?.trim() || primaryGroup?.telegramChatId;
      const tooltip = groupTitle ? `${groupTitle} · ${topicLabel}` : topicLabel;

      items.push({
        id: `topic-${threadId}`,
        name: topicLabel,
        tooltip,
        imageSrc: primaryGroup?.chatPhotoUrl
          ? withCacheBuster(primaryGroup.chatPhotoUrl, primaryGroup.updatedAt)
          : null,
        imageAlt: topicLabel,
        kind: "topic",
      });
    }
  }

  return items;
}

export function resolveDestinationsLabel(alert: AlertSummaryDto) {
  if (alert.destinationType === "GROUP") return "Grupos";
  if (alert.destinationType === "MEMBERS") return "Membros";
  if (alert.destinationType === "TOPIC") return "Tópicos";
  if (alert.destinationType === "AUTOMATION") return "Grupos/Tópicos";
  if (alert.destinationType === "QUICK_ALERT") return "Aviso rápido";
  return "Destinos";
}
