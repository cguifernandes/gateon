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

export const telegramGroupSummarySchema = z.object({
  id: z.string(),
  telegramChatId: z.string(),
  title: z.string().nullable(),
  type: z.string(),
  botStatus: z.string(),
  connectedAt: z.string(),
  updatedAt: z.string(),
  memberCount: z.number().int().nonnegative().nullable(),
  connectedBy: telegramGroupMemberSummarySchema.nullable(),
});

export const telegramGroupsResponseSchema = z.array(telegramGroupSummarySchema);

export type TelegramGroupSummaryDto = z.infer<
  typeof telegramGroupSummarySchema
>;
