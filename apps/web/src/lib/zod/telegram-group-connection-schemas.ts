import { z } from "zod";
import {
  membersPaginationMetaSchema,
  paginationMetaSchema,
} from "./pagination-schemas";
import { telegramGroupBotSettingsSchema } from "./telegram-group-bot-settings-schemas";

/** Matches Prisma `TelegramConnectionStatus` from the Nest API */
export const telegramConnectionStatusSchema = z.enum([
  "PENDING",
  "TELEGRAM_USER_CONFIRMED",
  "WAITING_FOR_PERMISSIONS",
  "CONNECTED",
  "EXPIRED",
  "FAILED",
]);

export type TelegramConnectionStatusFromApi = z.infer<
  typeof telegramConnectionStatusSchema
>;

export const startTelegramGroupConnectionResponseSchema = z.object({
  intentId: z.string(),
  status: telegramConnectionStatusSchema,
  expiresAt: z.string(),
  privateStartUrl: z.url(),
  startGroupUrl: z.url(),
});

export type StartTelegramGroupConnectionResponseDto = z.infer<
  typeof startTelegramGroupConnectionResponseSchema
>;

export const telegramGroupConnectionIntentStatusSchema = z.object({
  id: z.string(),
  status: telegramConnectionStatusSchema,
  expiresAt: z.string(),
  consumedAt: z.string().nullable().optional(),
  telegramChatId: z.string().nullable().optional(),
  telegramChatTitle: z.string().nullable().optional(),
  telegramChatType: z.string().nullable().optional(),
});

export type TelegramGroupConnectionIntentStatusDto = z.infer<
  typeof telegramGroupConnectionIntentStatusSchema
>;

export const linkedStripePlanSummarySchema = z.object({
  connectionId: z.string(),
  label: z.string(),
  cancelAtPeriodEnd: z.boolean().default(false),
});

export const telegramTrackedMemberStatusSchema = z.enum(["active", "left"]);

export const telegramGroupChatMemberSchema = z.object({
  telegramUserId: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
  joinedAt: z.string(),
  leftAt: z.string().nullable(),
  status: telegramTrackedMemberStatusSchema,
  isOwner: z.boolean(),
  linkedStripePlans: z.array(linkedStripePlanSummarySchema).default([]),
});

export const telegramGroupChatMemberDetailSchema =
  telegramGroupChatMemberSchema.extend({
    updatedAt: z.string(),
  });

export const telegramGroupMembersListResponseSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  telegramChatId: z.string(),
  type: z.string(),
  isForum: z.boolean(),
  memberCount: z.number().int().nonnegative().nullable(),
  trackedMemberCount: z.number().int().nonnegative(),
  trackedMemberLimitPerGroup: z.number().int().positive(),
  trackedMemberLimitReached: z.boolean(),
  leftMemberCount: z.number().int().nonnegative(),
  connectedAt: z.string(),
  lastSyncedAt: z.string(),
  members: z.array(telegramGroupChatMemberDetailSchema),
});

export type TelegramGroupMembersListResponseDto = z.infer<
  typeof telegramGroupMembersListResponseSchema
>;

export const telegramGroupSummarySchema = z.object({
  id: z.string(),
  telegramChatId: z.string(),
  title: z.string().nullable(),
  chatPhotoUrl: z.string().nullable(),
  type: z.string(),
  isForum: z.boolean(),
  botStatus: z.string(),
  connectedAt: z.string(),
  updatedAt: z.string(),
  memberCount: z.number().int().nonnegative().nullable(),
  trackedMemberCount: z.number().int().nonnegative(),
  leftMemberCount: z.number().int().nonnegative(),
  trackedMemberLimitPerGroup: z.number().int().positive(),
  trackedMemberLimitReached: z.boolean(),
  members: z.array(telegramGroupChatMemberSchema),
  membersPagination: membersPaginationMetaSchema.optional(),
  linkedStripePlans: z.array(linkedStripePlanSummarySchema).default([]),
});

export const telegramGroupsResponseSchema = z.array(telegramGroupSummarySchema);

export const telegramGroupOptionsResponseSchema = z.object({
  groups: z.array(telegramGroupSummarySchema),
});

export const telegramGroupsListSummarySchema = z.object({
  totalGroups: z.number().int().nonnegative(),
  pendingPermissionsCount: z.number().int().nonnegative(),
  planMemberUsagePercent: z.number().int().min(0).max(100),
});

export const telegramMembersListSummarySchema = z.object({
  totalMembers: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  leftCount: z.number().int().nonnegative(),
});

export const telegramGroupsPaginatedResponseSchema = z.object({
  groups: z.array(telegramGroupSummarySchema),
  pagination: paginationMetaSchema,
  summary: telegramGroupsListSummarySchema,
  membersSummary: telegramMembersListSummarySchema.optional(),
});

export type TelegramGroupsListSummaryDto = z.infer<
  typeof telegramGroupsListSummarySchema
>;
export type TelegramMembersListSummaryDto = z.infer<
  typeof telegramMembersListSummarySchema
>;
export type TelegramGroupsPaginatedResponseDto = z.infer<
  typeof telegramGroupsPaginatedResponseSchema
>;

export type TelegramGroupSummaryDto = z.infer<
  typeof telegramGroupSummarySchema
>;

export type TelegramGroupOptionsResponseDto = z.infer<
  typeof telegramGroupOptionsResponseSchema
>;

export const telegramBotAdministratorRightsSchema = z.object({
  canManageChat: z.boolean(),
  canRestrictMembers: z.boolean(),
  canInviteUsers: z.boolean(),
  canDeleteMessages: z.boolean(),
  canPinMessages: z.boolean(),
  canChangeInfo: z.boolean(),
  canPromoteMembers: z.boolean(),
  canManageVideoChats: z.boolean(),
  canManageTopics: z.boolean(),
});

export const telegramBotPermissionsSnapshotSchema = z
  .object({
    botStatus: z.string(),
    administratorRights: telegramBotAdministratorRightsSchema.nullable(),
    missingRequiredRightIds: z.array(z.string()),
  })
  .nullable();

export const telegramGroupDetailSchema = telegramGroupSummarySchema
  .omit({ members: true })
  .extend({
    settings: telegramGroupBotSettingsSchema,
    permissions: telegramBotPermissionsSnapshotSchema,
  });

export type TelegramGroupDetailDto = z.infer<typeof telegramGroupDetailSchema>;

export const refreshTelegramGroupResultSchema = z.object({
  refreshed: z.boolean().optional(),
  synced: z
    .object({
      title: z.string().nullable().optional(),
      chatType: z.string().optional(),
      isForum: z.boolean().optional(),
      memberCount: z.number().int().nonnegative().nullable().optional(),
      hasChatPhoto: z.boolean().optional(),
      telegramChatId: z.string().optional(),
    })
    .optional(),
  botStatus: z.string().nullable().optional(),
  permissions: telegramBotPermissionsSnapshotSchema.optional(),
});

export type RefreshTelegramGroupResultDto = z.infer<
  typeof refreshTelegramGroupResultSchema
>;

export const refreshAllTelegramGroupsResultSchema = z.object({
  refreshed: z.boolean().optional(),
  refreshedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  failures: z.array(
    z.object({
      groupId: z.string(),
      title: z.string().nullable(),
      error: z.string(),
    }),
  ),
});

export type RefreshAllTelegramGroupsResultDto = z.infer<
  typeof refreshAllTelegramGroupsResultSchema
>;

export const telegramGroupMemberActionSchema = z.enum([
  "notice",
  "remove",
  "ban",
]);

export const memberBulkSelectionScopeSchema = z.enum([
  "active_removable",
  "active",
  "all_tracked",
]);

export const telegramGroupMemberBulkActionRequestSchema = z
  .object({
    action: telegramGroupMemberActionSchema,
    telegramUserIds: z.array(z.string().trim().min(1)).max(100).optional(),
    allMatching: z
      .object({
        scope: memberBulkSelectionScopeSchema,
      })
      .optional(),
    text: z.string().trim().min(1).max(4096).optional(),
  })
  .superRefine((data, ctx) => {
    const hasIds = (data.telegramUserIds?.length ?? 0) > 0;
    const hasAllMatching = Boolean(data.allMatching);

    if (hasIds === hasAllMatching) {
      ctx.addIssue({
        code: "custom",
        message: "Provide telegramUserIds or allMatching.",
        path: ["telegramUserIds"],
      });
    }
  });

export const telegramGroupMemberBulkActionResultSchema = z.object({
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  failures: z.array(
    z.object({
      telegramUserId: z.string(),
      reason: z.string(),
    }),
  ),
});

export type TelegramGroupMemberBulkActionResultDto = z.infer<
  typeof telegramGroupMemberBulkActionResultSchema
>;
