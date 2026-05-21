import { z } from "zod";

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

export const telegramGroupMemberSummarySchema = z.object({
  telegramUserId: z.string(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export const telegramGroupChatMemberSchema = z.object({
  telegramUserId: z.string(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
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
  trackedMemberLimitPerGroup: z.number().int().positive(),
  trackedMemberLimitReached: z.boolean(),
  connectedBy: telegramGroupMemberSummarySchema.nullable(),
  connectedByProfilePhotoUrl: z.string().nullable(),
  members: z.array(telegramGroupChatMemberSchema),
});

export const telegramGroupsResponseSchema = z.array(telegramGroupSummarySchema);

export type TelegramGroupSummaryDto = z.infer<
  typeof telegramGroupSummarySchema
>;
