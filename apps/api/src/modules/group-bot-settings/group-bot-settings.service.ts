import { timingSafeEqual } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { TelegramGroupBotSettingsPatchInput } from './schemas/group-bot-settings-schemas';

type TelegramGroupBotSettingsRow = {
  enabled: boolean;
  notifyPermissionLoss: boolean;
};

@Injectable()
export class GroupBotSettingsService {
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

  async ensureForGroup(
    telegramGroupId: string,
  ): Promise<TelegramGroupBotSettingsRow> {
    const settings = await this.prisma.telegramGroupBotSettings.upsert({
      where: { telegramGroupId },
      create: {
        telegramGroupId,
        ...this.defaultSettings(),
      },
      update: {},
      select: this.settingsSelect(),
    });

    return this.mapSettings(settings);
  }

  async getForGroup(userId: string, groupId: string) {
    const group = await this.findOwnedGroup(userId, groupId);
    return this.ensureForGroup(group.id);
  }

  async updateForGroup(
    userId: string,
    groupId: string,
    input: TelegramGroupBotSettingsPatchInput,
  ) {
    const group = await this.findOwnedGroup(userId, groupId);

    const updated = await this.prisma.telegramGroupBotSettings.upsert({
      where: { telegramGroupId: group.id },
      create: {
        telegramGroupId: group.id,
        ...this.defaultSettings(),
        ...input,
      },
      update: input,
      select: this.settingsSelect(),
    });

    return this.mapSettings(updated);
  }

  async getInternalByChatId(telegramChatId: string) {
    const group = await this.prisma.telegramGroups.findUnique({
      where: { telegramChatId: telegramChatId.trim() },
      select: {
        id: true,
        telegramChatId: true,
        title: true,
      },
    });

    if (!group) {
      return { connected: false, settings: null };
    }

    return {
      connected: true,
      group,
      settings: await this.ensureForGroup(group.id),
    };
  }

  private async findOwnedGroup(userId: string, groupId: string) {
    const group = await this.prisma.telegramGroups.findFirst({
      where: { id: groupId, userId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException('Telegram group connection not found.');
    }

    return group;
  }

  private defaultSettings(): TelegramGroupBotSettingsRow {
    return {
      enabled: true,
      notifyPermissionLoss: true,
    };
  }

  private settingsSelect() {
    return {
      enabled: true,
      notifyPermissionLoss: true,
    } as const;
  }

  private mapSettings(
    settings: TelegramGroupBotSettingsRow,
  ): TelegramGroupBotSettingsRow {
    return {
      enabled: settings.enabled,
      notifyPermissionLoss: settings.notifyPermissionLoss,
    };
  }
}
