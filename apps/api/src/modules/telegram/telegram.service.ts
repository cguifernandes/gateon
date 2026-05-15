import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramConnectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashSensitiveValue } from '../../utils/utils';
import type { TelegramBotEventInput } from './schemas/telegram-schemas';
import {
  listMissingRequiredAdministratorRights,
  type TelegramAdministratorRightsInput,
} from '../../utils/utils';

type TelegramActor = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

type TelegramChat = {
  id: string;
  title?: string;
  type: string;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
};

const ACTIVE_INTENT_STATUSES: TelegramConnectionStatus[] = [
  TelegramConnectionStatus.PENDING,
  TelegramConnectionStatus.TELEGRAM_USER_CONFIRMED,
  TelegramConnectionStatus.WAITING_FOR_PERMISSIONS,
];

@Injectable()
export class TelegramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  isInternalSecretValid(candidate: string | undefined): boolean {
    const expected = this.config
      .get<string>('TELEGRAM_BOT_INTERNAL_SECRET')
      ?.trim();
    if (!expected || !candidate) {
      return false;
    }

    const expectedBuffer = Buffer.from(expected);
    const candidateBuffer = Buffer.from(candidate.trim());
    return (
      expectedBuffer.length === candidateBuffer.length &&
      timingSafeEqual(expectedBuffer, candidateBuffer)
    );
  }

  async startGroupConnection(userId: string) {
    await this.expireOldIntents();

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.intentTtlMs());

    await this.prisma.telegramGroupConnectionIntents.updateMany({
      where: {
        userId,
        status: { in: ACTIVE_INTENT_STATUSES },
      },
      data: { status: TelegramConnectionStatus.FAILED },
    });

    const intent = await this.prisma.telegramGroupConnectionIntents.create({
      data: {
        userId,
        tokenHash: this.hashConnectionToken(token),
        expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
        status: true,
      },
    });

    const botUsername = this.getBotUsername();
    return {
      intentId: intent.id,
      status: intent.status,
      expiresAt: intent.expiresAt,
      privateStartUrl: this.buildTelegramUrl(botUsername, 'start', token),
      startGroupUrl: this.buildTelegramUrl(botUsername, 'startgroup', token),
    };
  }

  async getGroupConnectionStatus(userId: string, intentId: string) {
    const intent = await this.prisma.telegramGroupConnectionIntents.findFirst({
      where: { id: intentId, userId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        consumedAt: true,
        telegramChatId: true,
        telegramChatTitle: true,
        telegramChatType: true,
      },
    });

    if (!intent) {
      throw new BadRequestException('Telegram connection intent not found.');
    }

    if (
      ACTIVE_INTENT_STATUSES.includes(intent.status) &&
      intent.expiresAt.getTime() <= Date.now()
    ) {
      await this.prisma.telegramGroupConnectionIntents.update({
        where: { id: intent.id },
        data: { status: TelegramConnectionStatus.EXPIRED },
      });
      return { ...intent, status: TelegramConnectionStatus.EXPIRED };
    }

    return intent;
  }

  async listGroups(userId: string) {
    const groups = await this.prisma.telegramGroups.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
      select: {
        id: true,
        telegramChatId: true,
        title: true,
        type: true,
        botStatus: true,
        connectedAt: true,
        updatedAt: true,
        addedByTelegramUserId: true,
      },
    });

    const accountIds = [...new Set(groups.map((g) => g.addedByTelegramUserId))];
    const accounts = await this.prisma.telegramAccounts.findMany({
      where: { userId, telegramUserId: { in: accountIds } },
      select: {
        telegramUserId: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });
    const accountsByTelegramId = new Map(
      accounts.map((account) => [account.telegramUserId, account]),
    );

    return Promise.all(
      groups.map(async (group) => {
        const telegramChatId = group.telegramChatId.trim();

        return {
          id: group.id,
          telegramChatId,
          title: group.title,
          type: group.type,
          botStatus: group.botStatus,
          connectedAt: group.connectedAt,
          updatedAt: group.updatedAt,
          memberCount: await this.getTelegramChatMemberCount(telegramChatId),
          connectedBy:
            accountsByTelegramId.get(group.addedByTelegramUserId) ?? null,
        };
      }),
    );
  }

  async removeGroupConnection(userId: string, groupId: string) {
    const group = await this.prisma.telegramGroups.findFirst({
      where: { id: groupId, userId },
      select: {
        id: true,
        telegramChatId: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Telegram group connection not found.');
    }

    const telegramChatId = group.telegramChatId.trim();
    const botLeft = await this.leaveTelegramChat(telegramChatId);

    await this.prisma.$transaction([
      this.prisma.telegramGroupConnectionIntents.deleteMany({
        where: {
          userId,
          telegramChatId: { in: [group.telegramChatId, telegramChatId] },
        },
      }),
      this.prisma.telegramGroups.delete({
        where: { id: group.id },
      }),
    ]);

    return {
      deleted: true,
      botLeft,
    };
  }

  async handleBotEvent(event: TelegramBotEventInput) {
    await this.expireOldIntents();

    if (event.eventType === 'private_start') {
      return this.confirmTelegramUser(event.token, event.telegramUser);
    }

    if (event.eventType === 'group_start') {
      return this.connectGroupFromToken(
        event.token,
        event.telegramUser,
        event.chat,
        event.botStatus,
        event.administratorRights,
      );
    }

    return this.connectGroupFromTelegramUser(
      event.telegramUser,
      event.chat,
      event.botStatus,
      event.administratorRights,
    );
  }

  private intentTtlMs(): number {
    const minutes = Number(
      this.config.get<string>('TELEGRAM_GROUP_CONNECTION_TTL_MINUTES') ?? 15,
    );
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 15;
    return safeMinutes * 60 * 1000;
  }

  private getBotUsername(): string {
    const raw = this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? 'GateonBot';
    return raw.trim().replace(/^@/, '');
  }

  private buildTelegramUrl(
    botUsername: string,
    param: 'start' | 'startgroup',
    token: string,
  ): string {
    return `https://t.me/${botUsername}?${param}=${encodeURIComponent(token)}`;
  }

  private hashConnectionToken(token: string): string {
    return hashSensitiveValue(`telegram-group-connection:${token}`);
  }

  private getTelegramBotToken(): string | null {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    return token || null;
  }

  private async getTelegramChatMemberCount(
    telegramChatId: string,
  ): Promise<number | null> {
    const token = this.getTelegramBotToken();
    const chatId = telegramChatId.trim();
    if (!token || !chatId) {
      return null;
    }

    try {
      const url = new URL(
        `https://api.telegram.org/bot${token}/getChatMemberCount`,
      );
      url.searchParams.set('chat_id', chatId);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as TelegramApiResponse<unknown>;
      return data.ok && typeof data.result === 'number' ? data.result : null;
    } catch {
      return null;
    }
  }

  private async leaveTelegramChat(
    telegramChatId: string,
  ): Promise<boolean | null> {
    const token = this.getTelegramBotToken();
    const chatId = telegramChatId.trim();
    if (!token || !chatId) {
      return null;
    }

    try {
      const url = new URL(`https://api.telegram.org/bot${token}/leaveChat`);
      url.searchParams.set('chat_id', chatId);

      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as TelegramApiResponse<unknown>;
      return data.ok && data.result === true;
    } catch {
      return false;
    }
  }

  private async expireOldIntents(): Promise<void> {
    await this.prisma.telegramGroupConnectionIntents.updateMany({
      where: {
        status: { in: ACTIVE_INTENT_STATUSES },
        expiresAt: { lte: new Date() },
      },
      data: { status: TelegramConnectionStatus.EXPIRED },
    });
  }

  private async findValidIntentByToken(token: string) {
    const intent = await this.prisma.telegramGroupConnectionIntents.findUnique({
      where: { tokenHash: this.hashConnectionToken(token) },
    });

    if (!intent) {
      throw new BadRequestException('Invalid Telegram connection token.');
    }

    if (intent.expiresAt.getTime() <= Date.now()) {
      await this.prisma.telegramGroupConnectionIntents.update({
        where: { id: intent.id },
        data: { status: TelegramConnectionStatus.EXPIRED },
      });
      throw new BadRequestException('Telegram connection token expired.');
    }

    if (
      intent.consumedAt ||
      intent.status === TelegramConnectionStatus.CONNECTED
    ) {
      throw new BadRequestException('Telegram connection token already used.');
    }

    return intent;
  }

  private async confirmTelegramUser(token: string, actor: TelegramActor) {
    const intent = await this.findValidIntentByToken(token);
    await this.upsertTelegramAccount(intent.userId, actor);

    const updated = await this.prisma.telegramGroupConnectionIntents.update({
      where: { id: intent.id },
      data: {
        telegramUserId: actor.id,
        status: TelegramConnectionStatus.TELEGRAM_USER_CONFIRMED,
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    return {
      status: updated.status,
      intentId: updated.id,
      expiresAt: updated.expiresAt,
      startGroupUrl: this.buildTelegramUrl(
        this.getBotUsername(),
        'startgroup',
        token,
      ),
    };
  }

  private async connectGroupFromToken(
    token: string,
    actor: TelegramActor,
    chat: TelegramChat,
    botStatus: string,
    administratorRights: TelegramAdministratorRightsInput | undefined,
  ) {
    const intent = await this.findValidIntentByToken(token);

    if (intent.telegramUserId && intent.telegramUserId !== actor.id) {
      throw new UnauthorizedException(
        'Telegram user does not match this connection intent.',
      );
    }

    await this.upsertTelegramAccount(intent.userId, actor);
    return this.persistGroupConnection(
      intent.id,
      intent.userId,
      actor,
      chat,
      botStatus,
      administratorRights,
    );
  }

  private async connectGroupFromTelegramUser(
    actor: TelegramActor,
    chat: TelegramChat,
    botStatus: string,
    administratorRights: TelegramAdministratorRightsInput | undefined,
  ) {
    const intent = await this.prisma.telegramGroupConnectionIntents.findFirst({
      where: {
        telegramUserId: actor.id,
        status: { in: ACTIVE_INTENT_STATUSES },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!intent) {
      throw new BadRequestException(
        'No active Telegram connection intent for this user.',
      );
    }

    return this.persistGroupConnection(
      intent.id,
      intent.userId,
      actor,
      chat,
      botStatus,
      administratorRights,
    );
  }

  private async upsertTelegramAccount(userId: string, actor: TelegramActor) {
    const existing = await this.prisma.telegramAccounts.findUnique({
      where: { telegramUserId: actor.id },
      select: { userId: true },
    });

    if (existing && existing.userId !== userId) {
      throw new ConflictException(
        'This Telegram account is already linked to another Gateon user.',
      );
    }

    return this.prisma.telegramAccounts.upsert({
      where: { telegramUserId: actor.id },
      update: {
        username: actor.username,
        firstName: actor.firstName,
        lastName: actor.lastName,
      },
      create: {
        userId,
        telegramUserId: actor.id,
        username: actor.username,
        firstName: actor.firstName,
        lastName: actor.lastName,
      },
    });
  }

  private async persistGroupConnection(
    intentId: string,
    userId: string,
    actor: TelegramActor,
    chat: TelegramChat,
    botStatus: string,
    administratorRights: TelegramAdministratorRightsInput | undefined,
  ) {
    const isElevated = botStatus === 'administrator' || botStatus === 'creator';

    if (!isElevated) {
      const updated = await this.prisma.telegramGroupConnectionIntents.update({
        where: { id: intentId },
        data: {
          status: TelegramConnectionStatus.WAITING_FOR_PERMISSIONS,
          telegramUserId: actor.id,
          telegramChatId: chat.id,
          telegramChatTitle: chat.title,
          telegramChatType: chat.type,
        },
        select: { id: true, status: true, expiresAt: true },
      });

      return {
        status: updated.status,
        intentId: updated.id,
        expiresAt: updated.expiresAt,
        reason: 'bot_must_be_administrator',
      };
    }

    if (botStatus === 'administrator') {
      if (!administratorRights) {
        const updated = await this.prisma.telegramGroupConnectionIntents.update(
          {
            where: { id: intentId },
            data: {
              status: TelegramConnectionStatus.WAITING_FOR_PERMISSIONS,
              telegramUserId: actor.id,
              telegramChatId: chat.id,
              telegramChatTitle: chat.title,
              telegramChatType: chat.type,
            },
            select: { id: true, status: true, expiresAt: true },
          },
        );

        return {
          status: updated.status,
          intentId: updated.id,
          expiresAt: updated.expiresAt,
          reason: 'bot_missing_required_admin_rights',
          missingRequiredRightIds: listMissingRequiredAdministratorRights({
            canManageChat: false,
            canRestrictMembers: false,
            canInviteUsers: false,
          }),
        };
      }

      const missing =
        listMissingRequiredAdministratorRights(administratorRights);

      if (missing.length > 0) {
        const updated = await this.prisma.telegramGroupConnectionIntents.update(
          {
            where: { id: intentId },
            data: {
              status: TelegramConnectionStatus.WAITING_FOR_PERMISSIONS,
              telegramUserId: actor.id,
              telegramChatId: chat.id,
              telegramChatTitle: chat.title,
              telegramChatType: chat.type,
            },
            select: { id: true, status: true, expiresAt: true },
          },
        );

        return {
          status: updated.status,
          intentId: updated.id,
          expiresAt: updated.expiresAt,
          reason: 'bot_missing_required_admin_rights',
          missingRequiredRightIds: missing,
        };
      }
    }

    const existingGroup = await this.prisma.telegramGroups.findUnique({
      where: { telegramChatId: chat.id },
      select: { userId: true },
    });

    if (existingGroup && existingGroup.userId !== userId) {
      throw new ConflictException(
        'This Telegram group is already linked to another Gateon user.',
      );
    }

    const group = await this.prisma.telegramGroups.upsert({
      where: { telegramChatId: chat.id },
      update: {
        title: chat.title,
        type: chat.type,
        addedByTelegramUserId: actor.id,
        botStatus,
      },
      create: {
        userId,
        telegramChatId: chat.id,
        title: chat.title,
        type: chat.type,
        addedByTelegramUserId: actor.id,
        botStatus,
      },
      select: {
        id: true,
        telegramChatId: true,
        title: true,
        type: true,
      },
    });

    const updatedIntent =
      await this.prisma.telegramGroupConnectionIntents.update({
        where: { id: intentId },
        data: {
          status: TelegramConnectionStatus.CONNECTED,
          consumedAt: new Date(),
          telegramUserId: actor.id,
          telegramChatId: chat.id,
          telegramChatTitle: chat.title,
          telegramChatType: chat.type,
        },
        select: { id: true, status: true, consumedAt: true },
      });

    return {
      status: updatedIntent.status,
      intentId: updatedIntent.id,
      consumedAt: updatedIntent.consumedAt,
      group,
    };
  }
}
