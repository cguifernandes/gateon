import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertDeliveryStatus,
  AlertDestinationType,
  AlertRunStatus,
  AlertStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  ALERT_DELIVERY_NO_TARGETS_MESSAGE,
  getAlertGroupDeliveryBlockReason,
} from '../../lib/alert-delivery-messages';
import {
  alertInternalTriggerSchema,
  type AlertContentInput,
  type AlertInternalTriggerInput,
  type AlertListQueryInput,
  type AlertOptionsInput,
  type AlertTemplateCreateInput,
  type AlertUpsertInput,
  toAlertTriggerTypeInput,
} from './schemas/alert-schemas';

const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;

type DeliveryTarget =
  | { kind: 'chat'; chatId: string; threadId?: number | null }
  | { kind: 'member'; telegramUserId: string };

type RunAlertOptions = {
  /** When set (event-triggered automation), deliver only to this Telegram chat. */
  scopeToTelegramChatId?: string;
  scopeToMessageThreadId?: number;
  /** When true (default), user-initiated runs throw if nothing was delivered. */
  throwOnTotalFailure?: boolean;
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  async listAlerts(userId: string, query: AlertListQueryInput) {
    const where: Prisma.TelegramAlertsWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.destinationType
        ? { destinationType: query.destinationType }
        : {}),
      ...(query.groupId ? { telegramGroupId: query.groupId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { internalTitle: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [alerts, activeCount, sentToday, runsToday, draftCount] =
      await Promise.all([
        this.prisma.telegramAlerts.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            group: { select: { id: true, title: true, botStatus: true } },
            targets: { select: { telegramUserId: true } },
            runs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                status: true,
                successCount: true,
                failCount: true,
                startedAt: true,
                finishedAt: true,
              },
            },
          },
        }),
        this.prisma.telegramAlerts.count({
          where: { userId, status: AlertStatus.ACTIVE },
        }),
        this.prisma.telegramAlertDeliveries.count({
          where: {
            status: 'SENT',
            createdAt: { gte: startOfDay },
            run: { alert: { userId } },
          },
        }),
        this.prisma.telegramAlertRuns.aggregate({
          where: {
            createdAt: { gte: startOfDay },
            alert: { userId },
          },
          _sum: { successCount: true, failCount: true },
        }),
        this.prisma.telegramAlerts.count({
          where: { userId, status: AlertStatus.DRAFT },
        }),
      ]);

    const success = runsToday._sum.successCount ?? 0;
    const failed = runsToday._sum.failCount ?? 0;
    const deliveryRate =
      success + failed === 0
        ? 0
        : Math.round((success / (success + failed)) * 100);

    return {
      alerts: alerts.map((alert) => ({
        ...alert,
        recipientCount: this.getStoredRecipientCount(alert),
        lastRun: alert.runs[0] ?? null,
      })),
      stats: {
        activeCount,
        sentToday,
        deliveryRate,
        draftCount,
      },
    };
  }

  async getAlert(userId: string, alertId: string) {
    const alert = await this.prisma.telegramAlerts.findFirst({
      where: { id: alertId, userId },
      include: {
        group: { select: { id: true, title: true, botStatus: true } },
        targets: { select: { telegramUserId: true } },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found.');
    }

    return {
      ...alert,
      recipientCount: this.getStoredRecipientCount(alert),
    };
  }

  async createAlert(userId: string, input: AlertUpsertInput) {
    const normalizedInput = this.normalizeQuickAlertInput(
      this.normalizeTopicSelection(input),
    );
    await this.assertGroupsAccess(
      userId,
      this.getAlertGroupIds(normalizedInput),
    );

    const status = this.resolveInitialStatus(input);
    const options = this.normalizeOptions(input.options);

    const alert = await this.prisma.telegramAlerts.create({
      data: {
        userId,
        createdByUserId: userId,
        name: normalizedInput.name,
        internalTitle: normalizedInput.internalTitle,
        status,
        destinationType: normalizedInput.destinationType,
        telegramGroupId: normalizedInput.telegramGroupId,
        messageThreadId: normalizedInput.messageThreadId,
        content: normalizedInput.content as Prisma.InputJsonValue,
        options: options as Prisma.InputJsonValue,
        triggerType: normalizedInput.triggerType,
        triggerConfig: normalizedInput.triggerConfig as
          | Prisma.InputJsonValue
          | undefined,
        targets: {
          createMany: {
            data:
              normalizedInput.destinationType === AlertDestinationType.MEMBERS
                ? (normalizedInput.targetTelegramUserIds ?? []).map(
                    (telegramUserId) => ({
                      telegramUserId,
                    }),
                  )
                : [],
            skipDuplicates: true,
          },
        },
      },
    });

    if (
      status === AlertStatus.ACTIVE &&
      input.destinationType !== AlertDestinationType.AUTOMATION &&
      input.destinationType !== AlertDestinationType.QUICK_ALERT
    ) {
      await this.runAlert(alert.id);
    }

    return this.getAlert(userId, alert.id);
  }

  async updateAlert(userId: string, alertId: string, input: AlertUpsertInput) {
    await this.assertAlertAccess(userId, alertId);
    const normalizedInput = this.normalizeQuickAlertInput(
      this.normalizeTopicSelection(input),
    );
    await this.assertGroupsAccess(
      userId,
      this.getAlertGroupIds(normalizedInput),
    );

    const options = this.normalizeOptions(input.options);
    const status = input.status ?? undefined;

    await this.prisma.$transaction([
      this.prisma.telegramAlertTargets.deleteMany({ where: { alertId } }),
      this.prisma.telegramAlerts.update({
        where: { id: alertId },
        data: {
          name: normalizedInput.name,
          internalTitle: normalizedInput.internalTitle,
          ...(status ? { status } : {}),
          destinationType: normalizedInput.destinationType,
          telegramGroupId: normalizedInput.telegramGroupId,
          messageThreadId: normalizedInput.messageThreadId,
          content: normalizedInput.content as Prisma.InputJsonValue,
          options: options as Prisma.InputJsonValue,
          triggerType: normalizedInput.triggerType,
          triggerConfig: normalizedInput.triggerConfig as
            | Prisma.InputJsonValue
            | undefined,
        },
      }),
      ...(normalizedInput.destinationType === AlertDestinationType.MEMBERS &&
      normalizedInput.targetTelegramUserIds?.length
        ? [
            this.prisma.telegramAlertTargets.createMany({
              data: normalizedInput.targetTelegramUserIds.map(
                (telegramUserId) => ({
                  alertId,
                  telegramUserId,
                }),
              ),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return this.getAlert(userId, alertId);
  }

  async duplicateAlert(userId: string, alertId: string) {
    const alert = await this.getAlert(userId, alertId);
    return this.createAlert(userId, {
      name: `${alert.name} (cópia)`,
      internalTitle: alert.internalTitle ?? undefined,
      status: AlertStatus.DRAFT,
      destinationType: alert.destinationType,
      telegramGroupId: alert.telegramGroupId ?? undefined,
      messageThreadId: alert.messageThreadId ?? undefined,
      content: alert.content as AlertContentInput,
      options: alert.options as AlertOptionsInput,
      triggerType: toAlertTriggerTypeInput(alert.triggerType),
      triggerConfig:
        (alert.triggerConfig as AlertUpsertInput['triggerConfig']) ?? undefined,
      targetTelegramUserIds: alert.targets.map(
        (target) => target.telegramUserId,
      ),
    });
  }

  async pauseAlert(userId: string, alertId: string) {
    await this.assertAlertAccess(userId, alertId);
    return this.prisma.telegramAlerts.update({
      where: { id: alertId },
      data: { status: AlertStatus.PAUSED },
    });
  }

  async activateAlert(userId: string, alertId: string) {
    const alert = await this.getAlert(userId, alertId);

    await this.prisma.telegramAlerts.update({
      where: { id: alertId },
      data: { status: AlertStatus.ACTIVE },
    });

    if (
      alert.destinationType !== AlertDestinationType.AUTOMATION &&
      alert.destinationType !== AlertDestinationType.QUICK_ALERT
    ) {
      await this.runAlert(alertId);
    }

    return this.getAlert(userId, alertId);
  }

  async deleteAlert(userId: string, alertId: string) {
    await this.assertAlertAccess(userId, alertId);
    await this.prisma.telegramAlerts.delete({ where: { id: alertId } });
    return { deleted: true as const };
  }

  async listRuns(userId: string, alertId: string) {
    await this.assertAlertAccess(userId, alertId);
    return this.prisma.telegramAlertRuns.findMany({
      where: { alertId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listDeliveries(userId: string, alertId: string, runId: string) {
    await this.assertAlertAccess(userId, alertId);
    return this.prisma.telegramAlertDeliveries.findMany({
      where: { runId, run: { alertId } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listTemplates(userId: string) {
    return this.prisma.telegramAlertTemplates.findMany({
      where: { userId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createTemplate(userId: string, input: AlertTemplateCreateInput) {
    return this.prisma.telegramAlertTemplates.create({
      data: {
        userId,
        name: input.name,
        category: input.category,
        content: input.content,
      },
    });
  }

  async handleInternalTrigger(body: unknown) {
    const input = alertInternalTriggerSchema.parse(body);
    return this.triggerAlertsForEvent(input);
  }

  async runAlert(alertId: string, runOptions?: RunAlertOptions) {
    const alert = await this.prisma.telegramAlerts.findUnique({
      where: { id: alertId },
      include: {
        group: { select: { telegramChatId: true, botStatus: true } },
        targets: { select: { telegramUserId: true } },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found.');
    }

    const targets = await this.resolveDeliveryTargets(alert, runOptions);
    const run = await this.prisma.telegramAlertRuns.create({
      data: {
        alertId: alert.id,
        status: AlertRunStatus.RUNNING,
        estimatedCount: targets.length,
        startedAt: new Date(),
      },
    });

    let successCount = 0;
    let failCount = 0;
    let firstFailureMessage: string | null = null;
    const options = alert.options as AlertOptionsInput;
    const content = alert.content as AlertContentInput;
    const replyMarkup = this.buildReplyMarkup(content.inlineButtons);
    const text = this.buildMessageText(content);
    const waitMs = this.resolveWaitMs(options.rateLimitPerMinute);

    const chatTargets = targets.filter(
      (target): target is Extract<DeliveryTarget, { kind: 'chat' }> =>
        target.kind === 'chat',
    );
    const groupsByChatId = new Map(
      (
        await this.prisma.telegramGroups.findMany({
          where: {
            telegramChatId: {
              in: [...new Set(chatTargets.map((target) => target.chatId))],
            },
          },
          select: { telegramChatId: true, botStatus: true },
        })
      ).map((group) => [group.telegramChatId, group.botStatus] as const),
    );

    for (const [index, target] of targets.entries()) {
      let deliveryError: string | null = null;
      let delivered = false;

      if (target.kind === 'chat') {
        const blockReason = getAlertGroupDeliveryBlockReason(
          groupsByChatId.get(target.chatId) ?? alert.group?.botStatus,
        );
        if (blockReason) {
          deliveryError = blockReason;
        } else {
          const result = await this.telegram.sendAlertToChat({
            chatId: target.chatId,
            messageThreadId: target.threadId,
            text,
            silent: options.silent,
            pinMessage: options.pinMessage,
            replyMarkup,
          });
          delivered = result.ok;
          if (!result.ok) {
            deliveryError = result.reason;
          }
        }
      } else {
        const result = await this.telegram.sendAlertDm({
          telegramUserId: target.telegramUserId,
          text,
          silent: options.silent,
          replyMarkup,
        });
        delivered = result.ok;
        if (!result.ok) {
          deliveryError = result.reason;
        }
      }

      if (delivered) {
        successCount += 1;
      } else {
        failCount += 1;
        firstFailureMessage ??= deliveryError;
      }

      await this.prisma.telegramAlertDeliveries.create({
        data: {
          runId: run.id,
          status: delivered
            ? AlertDeliveryStatus.SENT
            : AlertDeliveryStatus.FAILED,
          error: delivered ? undefined : (deliveryError ?? undefined),
          sentAt: delivered ? new Date() : undefined,
          ...(target.kind === 'chat'
            ? { chatId: target.chatId, threadId: target.threadId ?? undefined }
            : { telegramUserId: target.telegramUserId }),
        },
      });

      if (index < targets.length - 1 && waitMs > 0) {
        await this.delay(waitMs);
      }
    }

    const status = this.resolveRunStatus(successCount, failCount);
    const deliveryRate =
      successCount + failCount === 0
        ? 0
        : Math.round((successCount / (successCount + failCount)) * 100);

    await this.prisma.$transaction([
      this.prisma.telegramAlertRuns.update({
        where: { id: run.id },
        data: {
          status,
          successCount,
          failCount,
          finishedAt: new Date(),
        },
      }),
      this.prisma.telegramAlerts.update({
        where: { id: alert.id },
        data: {
          status:
            failCount > 0 &&
            successCount === 0 &&
            options.autoPauseOnFailure !== false
              ? AlertStatus.FAILED
              : alert.status,
          deliveryRate,
          lastRunAt: new Date(),
        },
      }),
    ]);

    const shouldThrowOnFailure = runOptions?.throwOnTotalFailure ?? true;
    if (shouldThrowOnFailure && successCount === 0) {
      throw new BadRequestException(
        targets.length === 0
          ? ALERT_DELIVERY_NO_TARGETS_MESSAGE
          : (firstFailureMessage ??
              'Não foi possível enviar o alerta para nenhum destinatário.'),
      );
    }

    return {
      runId: run.id,
      status,
      successCount,
      failCount,
    };
  }

  private async triggerAlertsForEvent(input: AlertInternalTriggerInput) {
    const groupsForChat = await this.prisma.telegramGroups.findMany({
      where: { telegramChatId: input.chatId },
      select: { id: true },
    });
    const groupIdsForChat = new Set(groupsForChat.map((group) => group.id));

    const automationAlerts = await this.prisma.telegramAlerts.findMany({
      where: {
        status: AlertStatus.ACTIVE,
        destinationType: AlertDestinationType.AUTOMATION,
        triggerType: input.triggerType,
      },
      select: {
        id: true,
        telegramGroupId: true,
        triggerConfig: true,
      },
      take: 100,
    });

    const alertIds = new Set<string>();
    for (const alert of automationAlerts) {
      const groupIds = this.getStoredGroupIds(alert);
      if (groupIds.some((groupId) => groupIdsForChat.has(groupId))) {
        alertIds.add(alert.id);
      }
    }

    for (const alertId of alertIds) {
      await this.runAlert(alertId, {
        scopeToTelegramChatId: input.chatId,
        scopeToMessageThreadId: input.messageThreadId,
        throwOnTotalFailure: false,
      });
    }

    return { triggeredCount: alertIds.size };
  }

  private async resolveDeliveryTargets(
    alert: {
      destinationType: AlertDestinationType;
      telegramGroupId: string | null;
      messageThreadId: number | null;
      triggerConfig?: unknown;
      group: { telegramChatId: string; botStatus: string } | null;
      targets: { telegramUserId: string }[];
    },
    options?: RunAlertOptions,
  ): Promise<DeliveryTarget[]> {
    if (
      alert.destinationType === AlertDestinationType.GROUP ||
      alert.destinationType === AlertDestinationType.AUTOMATION
    ) {
      if (
        alert.destinationType === AlertDestinationType.AUTOMATION &&
        options?.scopeToTelegramChatId
      ) {
        return [
          {
            kind: 'chat',
            chatId: options.scopeToTelegramChatId,
            threadId:
              options.scopeToMessageThreadId ??
              alert.messageThreadId ??
              undefined,
          },
        ];
      }

      const groupIds = this.getStoredGroupIds(alert);
      if (groupIds.length === 0) {
        if (!alert.group) return [];
        return [
          {
            kind: 'chat',
            chatId: alert.group.telegramChatId,
            threadId: alert.messageThreadId,
          },
        ];
      }

      const groups = await this.prisma.telegramGroups.findMany({
        where: { id: { in: groupIds } },
        select: { telegramChatId: true },
      });

      return groups.map((group) => ({
        kind: 'chat' as const,
        chatId: group.telegramChatId,
        threadId: alert.messageThreadId ?? undefined,
      }));
    }

    if (alert.destinationType === AlertDestinationType.TOPIC) {
      const threadIds = this.getStoredTopicIds(alert);
      if (!alert.group || threadIds.length === 0) return [];
      return threadIds.map((threadId) => ({
        kind: 'chat' as const,
        chatId: alert.group!.telegramChatId,
        threadId,
      }));
    }

    if (alert.destinationType === AlertDestinationType.MEMBERS) {
      return alert.targets.map((target) => ({
        kind: 'member',
        telegramUserId: target.telegramUserId,
      }));
    }

    if (alert.destinationType === AlertDestinationType.QUICK_ALERT) {
      return [];
    }

    return [];
  }

  private buildMessageText(content: AlertContentInput) {
    return content.title ? `${content.title}\n\n${content.body}` : content.body;
  }

  private buildReplyMarkup(buttons?: { text: string; url: string }[]) {
    if (!buttons?.length) return undefined;

    return {
      inline_keyboard: buttons.map((button) => [
        { text: button.text, url: button.url },
      ]),
    };
  }

  private resolveWaitMs(rateLimitPerMinute = DEFAULT_RATE_LIMIT_PER_MINUTE) {
    if (rateLimitPerMinute <= 0) return 0;
    return Math.ceil(60_000 / Math.min(rateLimitPerMinute, 60));
  }

  private resolveRunStatus(successCount: number, failCount: number) {
    if (failCount === 0) return AlertRunStatus.COMPLETED;
    if (successCount === 0) return AlertRunStatus.FAILED;
    return AlertRunStatus.PARTIAL;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async assertAlertAccess(userId: string, alertId: string) {
    const alert = await this.prisma.telegramAlerts.findFirst({
      where: { id: alertId, userId },
      select: { id: true },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found.');
    }
  }

  private getAlertGroupIds(input: AlertUpsertInput): string[] {
    const fromConfig = (
      input.triggerConfig?.targetTelegramGroupIds ?? []
    ).filter(Boolean);
    if (fromConfig.length > 0) return fromConfig;
    return input.telegramGroupId ? [input.telegramGroupId] : [];
  }

  private getStoredGroupIds(alert: {
    telegramGroupId?: string | null;
    triggerConfig?: unknown;
  }): string[] {
    const config = (alert.triggerConfig ?? {}) as {
      targetTelegramGroupIds?: string[];
    };
    const fromConfig = (config.targetTelegramGroupIds ?? []).filter(Boolean);
    if (fromConfig.length > 0) return fromConfig;
    return alert.telegramGroupId ? [alert.telegramGroupId] : [];
  }

  private getStoredTopicIds(alert: {
    messageThreadId?: number | null;
    triggerConfig?: unknown;
  }): number[] {
    const config = (alert.triggerConfig ?? {}) as {
      targetMessageThreadIds?: number[];
    };
    const fromConfig = (config.targetMessageThreadIds ?? []).filter(
      (threadId) => Number.isFinite(threadId) && threadId > 0,
    );
    if (fromConfig.length > 0) return fromConfig;
    return alert.messageThreadId ? [alert.messageThreadId] : [];
  }

  private async assertGroupsAccess(userId: string, groupIds: string[]) {
    if (groupIds.length === 0) return;

    const count = await this.prisma.telegramGroups.count({
      where: { id: { in: groupIds }, userId },
    });

    if (count !== groupIds.length) {
      throw new BadRequestException('Telegram group not found.');
    }
  }

  private async assertGroupAccess(userId: string, telegramGroupId?: string) {
    if (!telegramGroupId) return;

    const group = await this.prisma.telegramGroups.findFirst({
      where: { id: telegramGroupId, userId },
      select: { id: true },
    });

    if (!group) {
      throw new BadRequestException('Telegram group not found.');
    }
  }

  private getStoredRecipientCount(alert: {
    destinationType: AlertDestinationType;
    telegramGroupId?: string | null;
    messageThreadId?: number | null;
    triggerConfig?: unknown;
    targets?: { telegramUserId: string }[];
  }) {
    if (alert.destinationType === AlertDestinationType.MEMBERS) {
      return alert.targets?.length ?? 0;
    }

    if (alert.destinationType === AlertDestinationType.QUICK_ALERT) {
      return null;
    }

    if (
      alert.destinationType === AlertDestinationType.GROUP ||
      alert.destinationType === AlertDestinationType.AUTOMATION
    ) {
      const count = this.getStoredGroupIds(alert).length;
      return count > 0 ? count : 1;
    }

    return alert.destinationType === AlertDestinationType.TOPIC
      ? this.getStoredTopicIds(alert).length || null
      : null;
  }

  private normalizeOptions(options: AlertOptionsInput) {
    return {
      silent: options.silent ?? false,
      pinMessage: options.pinMessage ?? false,
      mentionUsers: options.mentionUsers ?? false,
      respectLocalTime: options.respectLocalTime ?? true,
      autoPauseOnFailure: options.autoPauseOnFailure ?? true,
      rateLimitPerMinute:
        options.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
    };
  }

  private normalizeQuickAlertInput(input: AlertUpsertInput): AlertUpsertInput {
    if (input.destinationType !== AlertDestinationType.QUICK_ALERT) {
      return input;
    }

    return {
      ...input,
      telegramGroupId: undefined,
      messageThreadId: undefined,
      targetTelegramUserIds: [],
      triggerConfig: {
        ...(input.triggerConfig ?? {}),
        tableSelectionSource: undefined,
        targetTelegramGroupIds: [],
        targetMessageThreadIds: [],
      },
    };
  }

  private normalizeTopicSelection(input: AlertUpsertInput): AlertUpsertInput {
    const config = (input.triggerConfig ?? {}) as {
      targetTelegramGroupIds?: string[];
      targetMessageThreadIds?: number[];
    };
    const groupIds = (config.targetTelegramGroupIds ?? []).filter(Boolean);
    const fallbackGroupIds =
      groupIds.length > 0
        ? groupIds
        : input.telegramGroupId
          ? [input.telegramGroupId]
          : [];
    const topicIds = (config.targetMessageThreadIds ?? []).filter(
      (threadId) => Number.isFinite(threadId) && threadId > 0,
    );
    const fallbackTopicIds =
      topicIds.length > 0
        ? topicIds
        : input.messageThreadId
          ? [input.messageThreadId]
          : [];

    if (input.destinationType === AlertDestinationType.MEMBERS) {
      return {
        ...input,
        telegramGroupId: undefined,
        messageThreadId: undefined,
        triggerType: undefined,
        triggerConfig: {
          ...(input.triggerConfig ?? {}),
          tableSelectionSource: undefined,
          targetTelegramGroupIds: [],
          targetMessageThreadIds: [],
        },
      };
    }

    if (input.destinationType === AlertDestinationType.GROUP) {
      return {
        ...input,
        telegramGroupId: fallbackGroupIds[0],
        messageThreadId: undefined,
        targetTelegramUserIds: [],
        triggerType: undefined,
        triggerConfig: {
          ...(input.triggerConfig ?? {}),
          tableSelectionSource: undefined,
          targetTelegramGroupIds: fallbackGroupIds,
          targetMessageThreadIds: [],
        },
      };
    }

    if (input.destinationType === AlertDestinationType.AUTOMATION) {
      return {
        ...input,
        telegramGroupId: fallbackGroupIds[0],
        messageThreadId: undefined,
        targetTelegramUserIds: [],
        triggerConfig: {
          ...(input.triggerConfig ?? {}),
          tableSelectionSource: undefined,
          targetTelegramGroupIds: fallbackGroupIds,
          targetMessageThreadIds: [],
        },
      };
    }

    if (input.destinationType !== AlertDestinationType.TOPIC) {
      return input;
    }

    return {
      ...input,
      telegramGroupId: fallbackGroupIds[0],
      messageThreadId: fallbackTopicIds[0],
      targetTelegramUserIds: [],
      triggerType: undefined,
      triggerConfig: {
        ...(input.triggerConfig ?? {}),
        tableSelectionSource: undefined,
        targetTelegramGroupIds: fallbackGroupIds[0]
          ? [fallbackGroupIds[0]]
          : [],
        targetMessageThreadIds: fallbackTopicIds,
      },
    };
  }

  private resolveInitialStatus(input: AlertUpsertInput) {
    return input.status ?? AlertStatus.DRAFT;
  }
}
