import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramConnectionStatus } from '@prisma/client';
import { GroupLimitService } from '../../lib/group-limit.service';
import { PrismaService } from '../prisma/prisma.service';
import { hashSensitiveValue } from '../../utils/utils';
import type { TelegramBotEventInput } from './schemas/telegram-schemas';
import {
  listMissingRequiredAdministratorRights,
  type TelegramAdministratorRightsInput,
} from '../../utils/utils';

type TelegramActor = {
  id: string;
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

/** Max active members returned in list groups (full count in trackedMemberCount). */
const MEMBER_PREVIEW_LIMIT = 50;

type TrackedMemberRow = {
  telegramUserId: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoFileId: string | null;
  joinedAt: Date;
  leftAt: Date | null;
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly groupLimit: GroupLimitService,
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
    await this.groupLimit.assertCanConnectNewGroup(userId);
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

  private mapTrackedMemberToDto(groupId: string, member: TrackedMemberRow) {
    return {
      telegramUserId: member.telegramUserId,
      firstName: member.firstName,
      lastName: member.lastName,
      profilePhotoUrl: member.profilePhotoFileId
        ? `/api/telegram/groups/${groupId}/members/${encodeURIComponent(member.telegramUserId)}/profile-photo`
        : null,
      joinedAt: member.joinedAt.toISOString(),
      leftAt: member.leftAt?.toISOString() ?? null,
      status: member.leftAt ? ('left' as const) : ('active' as const),
    };
  }

  async listGroups(userId: string) {
    const trackedMemberLimitPerGroup =
      await this.groupLimit.getMaxManagedMembersPerGroup(userId);

    const groups = await this.prisma.telegramGroups.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
      select: {
        id: true,
        telegramChatId: true,
        title: true,
        chatPhotoFileId: true,
        type: true,
        isForum: true,
        botStatus: true,
        connectedAt: true,
        updatedAt: true,
        addedByTelegramUserId: true,
        addedByProfilePhotoFileId: true,
        members: {
          where: { leftAt: null },
          orderBy: { updatedAt: 'desc' },
          take: MEMBER_PREVIEW_LIMIT,
          select: {
            telegramUserId: true,
            firstName: true,
            lastName: true,
            profilePhotoFileId: true,
            joinedAt: true,
            leftAt: true,
          },
        },
        _count: {
          select: {
            members: { where: { leftAt: null } },
          },
        },
      },
    });

    const accountIds = [...new Set(groups.map((g) => g.addedByTelegramUserId))];
    const accounts = await this.prisma.telegramAccounts.findMany({
      where: { userId, telegramUserId: { in: accountIds } },
      select: {
        telegramUserId: true,
        firstName: true,
        lastName: true,
      },
    });
    const accountsByTelegramId = new Map(
      accounts.map((account) => [account.telegramUserId, account]),
    );

    const groupIds = groups.map((group) => group.id);
    const leftMemberCounts =
      groupIds.length > 0
        ? await this.prisma.telegramGroupMembers.groupBy({
            by: ['telegramGroupId'],
            where: {
              telegramGroupId: { in: groupIds },
              leftAt: { not: null },
            },
            _count: { _all: true },
          })
        : [];
    const leftMemberCountByGroupId = new Map(
      leftMemberCounts.map((row) => [row.telegramGroupId, row._count._all]),
    );

    return Promise.all(
      groups.map(async (group) => {
        const telegramChatId = group.telegramChatId.trim();

        return {
          id: group.id,
          telegramChatId,
          title: group.title,
          chatPhotoUrl: group.chatPhotoFileId
            ? `/api/telegram/groups/${group.id}/chat-photo`
            : null,
          type: group.type,
          isForum: group.isForum,
          botStatus: group.botStatus,
          connectedAt: group.connectedAt,
          updatedAt: group.updatedAt,
          memberCount: await this.getTelegramChatMemberCount(telegramChatId),
          trackedMemberCount: group._count.members,
          leftMemberCount: leftMemberCountByGroupId.get(group.id) ?? 0,
          trackedMemberLimitPerGroup,
          trackedMemberLimitReached:
            group._count.members >= trackedMemberLimitPerGroup,
          connectedBy:
            accountsByTelegramId.get(group.addedByTelegramUserId) ?? null,
          connectedByProfilePhotoUrl: group.addedByProfilePhotoFileId
            ? `/api/telegram/groups/${group.id}/connector-profile-photo`
            : null,
          members: group.members.map((m) =>
            this.mapTrackedMemberToDto(group.id, m),
          ),
        };
      }),
    );
  }

  async listGroupsForMembersView(userId: string) {
    const trackedMemberLimitPerGroup =
      await this.groupLimit.getMaxManagedMembersPerGroup(userId);

    const groups = await this.prisma.telegramGroups.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
      select: {
        id: true,
        telegramChatId: true,
        title: true,
        chatPhotoFileId: true,
        type: true,
        isForum: true,
        botStatus: true,
        connectedAt: true,
        updatedAt: true,
        addedByTelegramUserId: true,
        addedByProfilePhotoFileId: true,
        members: {
          orderBy: [{ leftAt: 'asc' }, { updatedAt: 'desc' }],
          select: {
            telegramUserId: true,
            firstName: true,
            lastName: true,
            profilePhotoFileId: true,
            joinedAt: true,
            leftAt: true,
          },
        },
        _count: {
          select: {
            members: { where: { leftAt: null } },
          },
        },
      },
    });

    const accountIds = [...new Set(groups.map((g) => g.addedByTelegramUserId))];
    const accounts = await this.prisma.telegramAccounts.findMany({
      where: { userId, telegramUserId: { in: accountIds } },
      select: {
        telegramUserId: true,
        firstName: true,
        lastName: true,
      },
    });
    const accountsByTelegramId = new Map(
      accounts.map((account) => [account.telegramUserId, account]),
    );

    const groupIds = groups.map((group) => group.id);
    const leftMemberCounts =
      groupIds.length > 0
        ? await this.prisma.telegramGroupMembers.groupBy({
            by: ['telegramGroupId'],
            where: {
              telegramGroupId: { in: groupIds },
              leftAt: { not: null },
            },
            _count: { _all: true },
          })
        : [];
    const leftMemberCountByGroupId = new Map(
      leftMemberCounts.map((row) => [row.telegramGroupId, row._count._all]),
    );

    return Promise.all(
      groups.map(async (group) => {
        const telegramChatId = group.telegramChatId.trim();

        return {
          id: group.id,
          telegramChatId,
          title: group.title,
          chatPhotoUrl: group.chatPhotoFileId
            ? `/api/telegram/groups/${group.id}/chat-photo`
            : null,
          type: group.type,
          isForum: group.isForum,
          botStatus: group.botStatus,
          connectedAt: group.connectedAt,
          updatedAt: group.updatedAt,
          memberCount: await this.getTelegramChatMemberCount(telegramChatId),
          trackedMemberCount: group._count.members,
          leftMemberCount: leftMemberCountByGroupId.get(group.id) ?? 0,
          trackedMemberLimitPerGroup,
          trackedMemberLimitReached:
            group._count.members >= trackedMemberLimitPerGroup,
          connectedBy:
            accountsByTelegramId.get(group.addedByTelegramUserId) ?? null,
          connectedByProfilePhotoUrl: group.addedByProfilePhotoFileId
            ? `/api/telegram/groups/${group.id}/connector-profile-photo`
            : null,
          members: group.members.map((m) =>
            this.mapTrackedMemberToDto(group.id, m),
          ),
        };
      }),
    );
  }

  async listGroupMembers(userId: string, groupId: string) {
    const group = await this.prisma.telegramGroups.findFirst({
      where: { id: groupId, userId },
      select: {
        id: true,
        title: true,
        telegramChatId: true,
        type: true,
        isForum: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Telegram group connection not found.');
    }

    const trackedMemberLimitPerGroup =
      await this.groupLimit.getMaxManagedMembersPerGroup(userId);

    const members = await this.prisma.telegramGroupMembers.findMany({
      where: { telegramGroupId: groupId },
      orderBy: [{ leftAt: 'asc' }, { updatedAt: 'desc' }],
      select: {
        telegramUserId: true,
        firstName: true,
        lastName: true,
        profilePhotoFileId: true,
        joinedAt: true,
        leftAt: true,
        updatedAt: true,
      },
    });

    const telegramChatId = group.telegramChatId.trim();
    const trackedMemberCount = members.filter((m) => m.leftAt === null).length;
    const leftMemberCount = members.length - trackedMemberCount;

    return {
      id: group.id,
      title: group.title,
      telegramChatId,
      type: group.type,
      isForum: group.isForum,
      memberCount: await this.getTelegramChatMemberCount(telegramChatId),
      trackedMemberCount,
      trackedMemberLimitPerGroup,
      trackedMemberLimitReached:
        trackedMemberCount >= trackedMemberLimitPerGroup,
      leftMemberCount,
      connectedAt: group.connectedAt.toISOString(),
      lastSyncedAt: group.updatedAt.toISOString(),
      members: members.map((m) => ({
        ...this.mapTrackedMemberToDto(group.id, m),
        updatedAt: m.updatedAt.toISOString(),
      })),
    };
  }

  async refreshGroupConnection(userId: string, groupId: string) {
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

    const { telegramChatId: syncedChatId } =
      await this.syncTelegramGroupRichMetadata(group.id, group.telegramChatId);

    const updated = await this.prisma.telegramGroups.findFirst({
      where: { id: groupId, userId },
      select: {
        title: true,
        type: true,
        isForum: true,
        chatPhotoFileId: true,
        telegramChatId: true,
      },
    });

    if (!updated) {
      throw new NotFoundException('Telegram group connection not found.');
    }

    const memberCount = await this.getTelegramChatMemberCount(
      updated.telegramChatId,
    );

    return {
      refreshed: true,
      synced: {
        title: updated.title,
        hasChatPhoto: Boolean(updated.chatPhotoFileId),
        chatType: updated.type,
        isForum: updated.isForum,
        memberCount,
        telegramChatId: syncedChatId,
      },
    };
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

    if (event.eventType === 'chat_member') {
      return this.syncChatMemberForGateonGroup(event);
    }

    if (event.eventType === 'chat_migrated') {
      return this.handleChatMigrated(event);
    }

    if (event.eventType === 'chat_forum_updated') {
      return this.handleChatForumUpdated(event);
    }

    return this.connectGroupFromTelegramUser(
      event.telegramUser,
      event.chat,
      event.botStatus,
      event.administratorRights,
    );
  }

  private async handleChatForumUpdated(
    event: Extract<TelegramBotEventInput, { eventType: 'chat_forum_updated' }>,
  ): Promise<{
    ok: true;
    applied: boolean;
    isForum: boolean;
    group?: { id: string; telegramChatId: string; title: string | null };
  }> {
    const applied = await this.applyChatForumStatus(
      event.chatId,
      event.isForum,
      event.title,
    );

    if (!applied) {
      this.logger.warn(
        `chat_forum_updated not applied for chatId=${event.chatId} (no Gateon group with this telegramChatId)`,
      );
      return { ok: true, applied: false, isForum: event.isForum };
    }

    return {
      ok: true,
      applied: true,
      isForum: applied.isForum,
      group: {
        id: applied.id,
        telegramChatId: applied.telegramChatId,
        title: applied.title,
      },
    };
  }

  private async applyChatForumStatus(
    telegramChatId: string,
    isForum: boolean,
    titleFromEvent?: string,
  ): Promise<{
    id: string;
    telegramChatId: string;
    title: string | null;
    isForum: boolean;
  } | null> {
    const chatId = telegramChatId.trim();
    if (!chatId) {
      return null;
    }

    const group = await this.prisma.telegramGroups.findUnique({
      where: { telegramChatId: chatId },
      select: { id: true, title: true },
    });

    if (!group) {
      return null;
    }

    const chatResult = await this.fetchTelegramGetChatResult(chatId);
    const details = chatResult.details;
    const type = details?.type ?? 'supergroup';
    // getChat can lag after topics are disabled; never keep isForum true when the bot reports false.
    const resolvedForum =
      isForum === false
        ? false
        : details?.isForum !== undefined
          ? details.isForum
          : isForum;
    const title = titleFromEvent ?? details?.title ?? group.title;

    const updated = await this.prisma.telegramGroups.update({
      where: { id: group.id },
      data: {
        type,
        isForum: resolvedForum,
        ...(title !== undefined && title !== null ? { title } : {}),
        ...(details?.chatPhotoFileId !== undefined
          ? { chatPhotoFileId: details.chatPhotoFileId }
          : {}),
      },
      select: {
        id: true,
        telegramChatId: true,
        title: true,
        isForum: true,
      },
    });

    return {
      id: updated.id,
      telegramChatId: updated.telegramChatId,
      title: updated.title,
      isForum: updated.isForum,
    };
  }

  private async handleChatMigrated(
    event: Extract<TelegramBotEventInput, { eventType: 'chat_migrated' }>,
  ): Promise<{
    ok: true;
    applied: boolean;
    migratedToForum: boolean;
    group?: { id: string; telegramChatId: string; title: string | null };
  }> {
    const applied = await this.applyChatMigration(
      event.oldChatId,
      event.newChatId,
      event.title,
    );

    if (!applied) {
      this.logger.warn(
        `chat_migrated not applied for ${event.oldChatId} -> ${event.newChatId} (no Gateon group on old chat id, conflict, or invalid ids — see logs above)`,
      );
      return { ok: true, applied: false, migratedToForum: false };
    }

    return {
      ok: true,
      applied: true,
      migratedToForum: applied.isForum,
      group: {
        id: applied.id,
        telegramChatId: applied.telegramChatId,
        title: applied.title,
      },
    };
  }

  /**
   * Telegram upgrades a basic group to supergroup (new chat id). Optionally enables topics (forum).
   */
  private async applyChatMigration(
    oldChatId: string,
    newChatId: string,
    titleFromEvent?: string,
  ): Promise<{
    id: string;
    telegramChatId: string;
    title: string | null;
    isForum: boolean;
  } | null> {
    const oldId = oldChatId.trim();
    const newId = newChatId.trim();
    if (!oldId || !newId || oldId === newId) {
      this.logger.warn(
        `applyChatMigration skipped: invalid ids old=${oldId} new=${newId}`,
      );
      return null;
    }

    const group = await this.prisma.telegramGroups.findUnique({
      where: { telegramChatId: oldId },
      select: { id: true, userId: true, title: true },
    });

    if (!group) {
      this.logger.warn(
        `applyChatMigration skipped: no TelegramGroups row with telegramChatId=${oldId}. If you enabled topics on an already-supergroup chat, Telegram may not send migrate events — use Sincronizar dados instead.`,
      );
      return null;
    }

    const conflicting = await this.prisma.telegramGroups.findUnique({
      where: { telegramChatId: newId },
      select: { id: true, userId: true },
    });

    if (conflicting && conflicting.id !== group.id) {
      this.logger.warn(
        `Chat migration ${oldId} -> ${newId} skipped: new id already linked to group ${conflicting.id}`,
      );
      return null;
    }

    const chatResult = await this.fetchTelegramGetChatResult(newId);
    const details = chatResult.details;
    const type = details?.type ?? 'supergroup';
    const isForum = details?.isForum ?? false;
    const title = titleFromEvent ?? details?.title ?? group.title;

    const updated = await this.prisma.telegramGroups.update({
      where: { id: group.id },
      data: {
        telegramChatId: newId,
        type,
        isForum,
        ...(title !== undefined && title !== null ? { title } : {}),
        ...(details?.chatPhotoFileId !== undefined
          ? { chatPhotoFileId: details.chatPhotoFileId }
          : {}),
      },
      select: {
        id: true,
        telegramChatId: true,
        title: true,
        isForum: true,
      },
    });

    await this.prisma.telegramGroupConnectionIntents.updateMany({
      where: { telegramChatId: oldId },
      data: {
        telegramChatId: newId,
        telegramChatType: type,
        ...(title ? { telegramChatTitle: title } : {}),
      },
    });

    return {
      id: updated.id,
      telegramChatId: updated.telegramChatId,
      title: updated.title,
      isForum: updated.isForum,
    };
  }

  private async syncChatMemberForGateonGroup(
    event: Extract<TelegramBotEventInput, { eventType: 'chat_member' }>,
  ): Promise<{ ok: true; applied: boolean }> {
    const { chat, subjectUser, newMemberStatus } = event;
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      return { ok: true, applied: false };
    }
    if (subjectUser.isBot === true) {
      return { ok: true, applied: false };
    }

    const group = await this.prisma.telegramGroups.findUnique({
      where: { telegramChatId: chat.id },
      select: { id: true, userId: true },
    });
    if (!group) {
      return { ok: true, applied: false };
    }

    const telegramUserId = subjectUser.id;
    const firstName = subjectUser.firstName ?? null;
    const lastName = subjectUser.lastName ?? null;

    const isGone = newMemberStatus === 'left' || newMemberStatus === 'kicked';

    if (isGone) {
      const activeMember = await this.prisma.telegramGroupMembers.findUnique({
        where: {
          telegramGroupId_telegramUserId: {
            telegramGroupId: group.id,
            telegramUserId,
          },
        },
        select: { profilePhotoFileId: true },
      });

      let profilePhotoFileId: string | undefined;
      if (activeMember && !activeMember.profilePhotoFileId) {
        try {
          profilePhotoFileId =
            (await this.fetchTelegramUserProfilePhotos(telegramUserId)) ??
            undefined;
        } catch {
          profilePhotoFileId = undefined;
        }
      }

      await this.prisma.telegramGroupMembers.updateMany({
        where: {
          telegramGroupId: group.id,
          telegramUserId,
          leftAt: null,
        },
        data: {
          leftAt: new Date(),
          firstName,
          lastName,
          ...(profilePhotoFileId !== undefined ? { profilePhotoFileId } : {}),
        },
      });
      return { ok: true, applied: true };
    }

    const wasManaged = await this.upsertActiveGroupMember(
      group.id,
      group.userId,
      {
        telegramUserId,
        firstName,
        lastName,
        refreshProfilePhoto: true,
      },
    );
    return { ok: true, applied: wasManaged };
  }

  private async upsertActiveGroupMember(
    gateonGroupId: string,
    ownerUserId: string,
    fields: {
      telegramUserId: string;
      firstName: string | null;
      lastName: string | null;
      refreshProfilePhoto: boolean;
    },
  ): Promise<boolean> {
    const existingMember = await this.prisma.telegramGroupMembers.findUnique({
      where: {
        telegramGroupId_telegramUserId: {
          telegramGroupId: gateonGroupId,
          telegramUserId: fields.telegramUserId,
        },
      },
      select: { leftAt: true, profilePhotoFileId: true },
    });

    const createsOrReactivates =
      !existingMember || existingMember.leftAt !== null;
    if (createsOrReactivates) {
      const maxManagedMembersPerGroup =
        await this.groupLimit.getMaxManagedMembersPerGroup(ownerUserId);
      const activeTrackedMembers = await this.prisma.telegramGroupMembers.count(
        {
          where: {
            telegramGroupId: gateonGroupId,
            leftAt: null,
          },
        },
      );

      if (activeTrackedMembers >= maxManagedMembersPerGroup) {
        this.logger.log(
          `Member tracking limit reached for group ${gateonGroupId} (owner ${ownerUserId}).` +
            ` Skipping member ${fields.telegramUserId}. Active=${activeTrackedMembers}, limit=${maxManagedMembersPerGroup}.`,
        );
        return false;
      }
    }

    const shouldRefreshPhoto =
      fields.refreshProfilePhoto || !existingMember?.profilePhotoFileId;

    let profilePhotoFileId: string | null | undefined;
    if (shouldRefreshPhoto) {
      try {
        profilePhotoFileId = await this.fetchTelegramUserProfilePhotos(
          fields.telegramUserId,
        );
      } catch {
        profilePhotoFileId = undefined;
      }
    }

    await this.prisma.telegramGroupMembers.upsert({
      where: {
        telegramGroupId_telegramUserId: {
          telegramGroupId: gateonGroupId,
          telegramUserId: fields.telegramUserId,
        },
      },
      create: {
        telegramGroupId: gateonGroupId,
        telegramUserId: fields.telegramUserId,
        firstName: fields.firstName,
        lastName: fields.lastName,
        profilePhotoFileId: profilePhotoFileId ?? null,
        leftAt: null,
      },
      update: {
        firstName: fields.firstName,
        lastName: fields.lastName,
        leftAt: null,
        ...(createsOrReactivates ? { joinedAt: new Date() } : {}),
        ...(profilePhotoFileId !== undefined ? { profilePhotoFileId } : {}),
      },
    });
    return true;
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
        firstName: actor.firstName,
        lastName: actor.lastName,
      },
      create: {
        userId,
        telegramUserId: actor.id,
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

    if (!existingGroup) {
      await this.groupLimit.assertCanConnectNewGroup(userId, chat.id);
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

    await this.syncTelegramGroupRichMetadata(group.id, chat.id).catch(
      (err: unknown) => {
        this.logger.warn(
          `Telegram metadata sync failed for group ${group.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      },
    );

    await this.upsertActiveGroupMember(group.id, userId, {
      telegramUserId: actor.id,
      firstName: actor.firstName ?? null,
      lastName: actor.lastName ?? null,
      refreshProfilePhoto: true,
    })
      .then((managed) => {
        if (!managed) {
          this.logger.log(
            `Group connector member was not tracked due to plan cap for group ${group.id}.`,
          );
        }
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to seed group connector as member for ${group.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
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

  async getGroupChatPhotoFile(
    userId: string,
    groupId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const group = await this.prisma.telegramGroups.findFirst({
      where: { id: groupId, userId },
      select: {
        chatPhotoFileId: true,
      },
    });
    if (!group) {
      return null;
    }

    if (!group.chatPhotoFileId) {
      return null;
    }

    return this.downloadTelegramFileById(group.chatPhotoFileId);
  }

  async getGroupConnectorProfilePhotoFile(
    userId: string,
    groupId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const group = await this.prisma.telegramGroups.findFirst({
      where: { id: groupId, userId },
      select: { addedByProfilePhotoFileId: true },
    });

    if (!group?.addedByProfilePhotoFileId) {
      return null;
    }

    return this.downloadTelegramFileById(group.addedByProfilePhotoFileId);
  }

  async getGroupMemberProfilePhotoFile(
    userId: string,
    groupId: string,
    memberTelegramUserId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const row = await this.prisma.telegramGroupMembers.findFirst({
      where: {
        telegramGroupId: groupId,
        telegramUserId: memberTelegramUserId,
        group: { userId },
      },
      select: { profilePhotoFileId: true },
    });

    if (!row?.profilePhotoFileId) {
      return null;
    }

    return this.downloadTelegramFileById(row.profilePhotoFileId);
  }

  private async callTelegramBotMethod<T>(
    method: string,
    payload: Record<string, unknown>,
  ): Promise<T | null> {
    const token = this.getTelegramBotToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as TelegramApiResponse<T>;
      if (!data.ok) {
        return null;
      }
      return data.result as T;
    } catch {
      return null;
    }
  }

  private async downloadTelegramFileById(
    fileId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const token = this.getTelegramBotToken();
    if (!token || !fileId.trim()) {
      return null;
    }

    try {
      const meta = await this.callTelegramBotMethod<{ file_path?: string }>(
        'getFile',
        { file_id: fileId.trim() },
      );
      const filePath = meta?.file_path;
      if (!filePath || typeof filePath !== 'string') {
        return null;
      }

      const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const fileResponse = await fetch(downloadUrl, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!fileResponse.ok) {
        return null;
      }

      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      const contentType =
        fileResponse.headers.get('content-type') ?? 'application/octet-stream';
      return { buffer, contentType };
    } catch {
      return null;
    }
  }

  private parseTelegramChatRecord(result: Record<string, unknown>): {
    title?: string;
    chatPhotoFileId?: string | null;
    type?: string;
    isForum?: boolean;
  } {
    const title =
      typeof result.title === 'string' && result.title.trim()
        ? result.title.trim()
        : undefined;

    let chatPhotoFileId: string | null | undefined;
    if ('photo' in result) {
      let smallFileId: string | undefined;
      let bigFileId: string | undefined;
      const photo = result.photo;
      if (photo && typeof photo === 'object') {
        const p = photo as Record<string, unknown>;
        if (typeof p.small_file_id === 'string') {
          smallFileId = p.small_file_id;
        }
        if (typeof p.big_file_id === 'string') {
          bigFileId = p.big_file_id;
        }
      }
      chatPhotoFileId = smallFileId ?? bigFileId ?? null;
    }

    let type: string | undefined;
    let isForum: boolean | undefined;
    if (typeof result.type === 'string' && result.type.trim()) {
      type = result.type.trim();
      if (type === 'supergroup') {
        isForum = result.is_forum === true;
      } else {
        isForum = false;
      }
    }

    return { title, chatPhotoFileId, type, isForum };
  }

  private async fetchTelegramGetChatResult(telegramChatId: string): Promise<{
    details: {
      title?: string;
      chatPhotoFileId?: string | null;
      type?: string;
      isForum?: boolean;
    } | null;
    migrateToChatId: string | null;
  }> {
    const token = this.getTelegramBotToken();
    const chatId = telegramChatId.trim();
    if (!token || !chatId) {
      return { details: null, migrateToChatId: null };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/getChat`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId }),
          signal: AbortSignal.timeout(15_000),
        },
      );

      const data = (await response.json()) as TelegramApiResponse<
        Record<string, unknown>
      > & {
        parameters?: { migrate_to_chat_id?: number | string };
      };

      if (data.ok && data.result && typeof data.result === 'object') {
        return {
          details: this.parseTelegramChatRecord(data.result),
          migrateToChatId: null,
        };
      }

      const migrateRaw = data.parameters?.migrate_to_chat_id;
      if (migrateRaw !== undefined && migrateRaw !== null) {
        return {
          details: null,
          migrateToChatId: String(migrateRaw),
        };
      }

      return { details: null, migrateToChatId: null };
    } catch {
      return { details: null, migrateToChatId: null };
    }
  }

  private async fetchTelegramUserProfilePhotos(
    telegramUserId: string,
  ): Promise<string | null> {
    const numericId = Number(telegramUserId);
    if (!Number.isFinite(numericId)) {
      return null;
    }

    const result = await this.callTelegramBotMethod<{
      photos?: { file_id: string; width: number; height: number }[][];
    }>('getUserProfilePhotos', {
      user_id: numericId,
      limit: 1,
    });

    const sizes = result?.photos?.[0];
    if (!sizes?.length) {
      return null;
    }

    const sorted = [...sizes].sort(
      (a, b) => a.width * a.height - b.width * b.height,
    );
    return sorted[0]?.file_id ?? null;
  }

  private async syncTelegramGroupRichMetadata(
    groupRecordId: string,
    telegramChatId: string,
  ): Promise<{ migratedToForum: boolean; telegramChatId: string }> {
    let chat = telegramChatId.trim();
    if (!chat) {
      return { migratedToForum: false, telegramChatId: chat };
    }

    const groupRow = await this.prisma.telegramGroups.findUnique({
      where: { id: groupRecordId },
      select: { addedByTelegramUserId: true, telegramChatId: true },
    });
    if (!groupRow) {
      return { migratedToForum: false, telegramChatId: chat };
    }

    let migratedToForum = false;
    const initialFetch = await this.fetchTelegramGetChatResult(chat);
    if (initialFetch.migrateToChatId) {
      const migrated = await this.applyChatMigration(
        chat,
        initialFetch.migrateToChatId,
      );
      if (migrated) {
        migratedToForum = migrated.isForum;
        chat = migrated.telegramChatId;
      }
    }

    let connectorProfilePhotoFileId: string | null = null;
    try {
      connectorProfilePhotoFileId = await this.fetchTelegramUserProfilePhotos(
        groupRow.addedByTelegramUserId,
      );
    } catch {
      connectorProfilePhotoFileId = null;
    }

    const { details } =
      initialFetch.migrateToChatId && chat !== telegramChatId.trim()
        ? await this.fetchTelegramGetChatResult(chat)
        : initialFetch;

    const updateData: {
      title?: string;
      chatPhotoFileId?: string | null;
      type?: string;
      isForum?: boolean;
      addedByProfilePhotoFileId: string | null;
    } = {
      addedByProfilePhotoFileId: connectorProfilePhotoFileId,
    };

    if (details?.title !== undefined) {
      updateData.title = details.title;
    }
    if (details?.chatPhotoFileId !== undefined) {
      updateData.chatPhotoFileId = details.chatPhotoFileId;
    }
    if (details?.type !== undefined) {
      updateData.type = details.type;
      if (details.type === 'supergroup') {
        updateData.isForum = details.isForum ?? false;
      } else {
        updateData.isForum = false;
      }
    } else if (details?.isForum !== undefined) {
      updateData.isForum = details.isForum;
    }

    await this.prisma.telegramGroups.update({
      where: { id: groupRecordId },
      data: updateData,
    });

    return { migratedToForum, telegramChatId: chat };
  }
}
