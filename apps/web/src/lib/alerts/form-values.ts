import type {
  AlertSummaryDto,
  AlertUpsertInput,
} from "@/lib/zod/alert-schemas";

export const DEFAULT_ALERT_FORM_VALUES: AlertUpsertInput = {
  name: "",
  destinationType: "GROUP",
  content: { title: "", body: "" },
  options: {
    silent: false,
    pinMessage: false,
    mentionUsers: false,
    respectLocalTime: true,
    autoPauseOnFailure: true,
  },
  targetTelegramUserIds: [],
  triggerConfig: {},
};

function parseTriggerConfig(
  triggerConfig: unknown,
): NonNullable<AlertUpsertInput["triggerConfig"]> {
  if (!triggerConfig || typeof triggerConfig !== "object") {
    return {};
  }

  const raw = triggerConfig as Record<string, unknown>;

  return {
    ...(typeof raw.stripeConnectionId === "string"
      ? { stripeConnectionId: raw.stripeConnectionId }
      : {}),
    ...(Array.isArray(raw.targetTelegramGroupIds)
      ? {
          targetTelegramGroupIds: raw.targetTelegramGroupIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
        }
      : {}),
    ...(Array.isArray(raw.targetMessageThreadIds)
      ? {
          targetMessageThreadIds: raw.targetMessageThreadIds.filter(
            (id): id is number => typeof id === "number" && id > 0,
          ),
        }
      : {}),
  };
}

function resolveTargetGroupIds(alert: AlertSummaryDto): string[] {
  const fromConfig =
    parseTriggerConfig(alert.triggerConfig).targetTelegramGroupIds ?? [];

  if (fromConfig.length > 0) {
    return fromConfig;
  }

  return alert.telegramGroupId ? [alert.telegramGroupId] : [];
}

function resolveTargetTopicIds(alert: AlertSummaryDto): number[] {
  const fromConfig =
    parseTriggerConfig(alert.triggerConfig).targetMessageThreadIds ?? [];

  if (fromConfig.length > 0) {
    return fromConfig;
  }

  return alert.messageThreadId ? [alert.messageThreadId] : [];
}

export function mapAlertSummaryToFormValues(
  alert: AlertSummaryDto,
): AlertUpsertInput {
  const triggerConfig = parseTriggerConfig(alert.triggerConfig);
  const targetTelegramGroupIds = resolveTargetGroupIds(alert);
  const targetMessageThreadIds = resolveTargetTopicIds(alert);
  const primaryGroupId = targetTelegramGroupIds[0];
  const primaryTopicId = targetMessageThreadIds[0];

  return {
    name: alert.name,
    internalTitle: alert.internalTitle ?? undefined,
    status: alert.status,
    destinationType: alert.destinationType,
    telegramGroupId: alert.telegramGroupId ?? primaryGroupId ?? undefined,
    messageThreadId: alert.messageThreadId ?? primaryTopicId ?? undefined,
    content: {
      title: alert.content.title,
      body: alert.content.body,
      imageUrl: alert.content.imageUrl ?? "",
      inlineButtons: alert.content.inlineButtons?.map((button) => ({
        text: button.text,
        url: button.url,
      })),
    },
    options: {
      silent: alert.options.silent,
      pinMessage: alert.options.pinMessage,
      mentionUsers: alert.options.mentionUsers,
      respectLocalTime: alert.options.respectLocalTime,
      autoPauseOnFailure: alert.options.autoPauseOnFailure,
    },
    triggerType: alert.triggerType ?? undefined,
    triggerConfig: {
      ...triggerConfig,
      targetTelegramGroupIds,
      targetMessageThreadIds,
    },
    targetTelegramUserIds:
      alert.targets?.map((target) => target.telegramUserId) ?? [],
  };
}
