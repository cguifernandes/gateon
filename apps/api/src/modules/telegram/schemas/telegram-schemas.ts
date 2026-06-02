import { z } from 'zod';

const telegramIdSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1));

const optionalTextSchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const telegramUserSchema = z.object({
  id: telegramIdSchema,
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
});

export const telegramChatSchema = z.object({
  id: telegramIdSchema,
  title: optionalTextSchema,
  type: z.string().trim().min(1),
});

export const telegramBotStatusSchema = z.enum([
  'creator',
  'administrator',
  'member',
  'restricted',
  'left',
  'kicked',
]);

export const telegramAdministratorRightsSchema = z.object({
  canManageChat: z.boolean(),
  canRestrictMembers: z.boolean(),
  canInviteUsers: z.boolean(),
});

const groupStartEventSchema = z
  .object({
    eventType: z.literal('group_start'),
    token: z.string().trim().min(1),
    telegramUser: telegramUserSchema,
    chat: telegramChatSchema,
    botStatus: telegramBotStatusSchema,
    administratorRights: telegramAdministratorRightsSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.botStatus === 'administrator' && !val.administratorRights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'administratorRights is required when botStatus is administrator',
        path: ['administratorRights'],
      });
    }
  });

const botChatMemberEventSchema = z
  .object({
    eventType: z.literal('bot_chat_member'),
    telegramUser: telegramUserSchema,
    chat: telegramChatSchema,
    botStatus: telegramBotStatusSchema,
    administratorRights: telegramAdministratorRightsSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.botStatus === 'administrator' && !val.administratorRights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'administratorRights is required when botStatus is administrator',
        path: ['administratorRights'],
      });
    }
  });

const chatMemberEventSchema = z.object({
  eventType: z.literal('chat_member'),
  chat: telegramChatSchema,
  subjectUser: z.object({
    id: telegramIdSchema,
    firstName: optionalTextSchema,
    lastName: optionalTextSchema,
    isBot: z.boolean().optional(),
  }),
  newMemberStatus: telegramBotStatusSchema,
});

const chatMigratedEventSchema = z.object({
  eventType: z.literal('chat_migrated'),
  oldChatId: telegramIdSchema,
  newChatId: telegramIdSchema,
  title: optionalTextSchema,
});

/** Fired when topics are enabled on an existing supergroup (no chat id migration). */
const chatForumUpdatedEventSchema = z.object({
  eventType: z.literal('chat_forum_updated'),
  chatId: telegramIdSchema,
  isForum: z.boolean(),
  title: optionalTextSchema,
});

/** Sync forum topic metadata from bot service messages (created/edited/closed/reopened). */
const forumTopicUpsertEventSchema = z.object({
  eventType: z.literal('forum_topic_upsert'),
  chatId: telegramIdSchema,
  messageThreadId: z.number().int().positive(),
  name: z.string().trim().min(1).max(128).optional(),
  iconColor: z.number().int().optional(),
  isClosed: z.boolean().optional(),
});

export const telegramBotEventSchema = z.union([
  z.object({
    eventType: z.literal('private_start'),
    token: z.string().trim().min(1),
    telegramUser: telegramUserSchema,
  }),
  groupStartEventSchema,
  botChatMemberEventSchema,
  chatMemberEventSchema,
  chatMigratedEventSchema,
  chatForumUpdatedEventSchema,
  forumTopicUpsertEventSchema,
]);

export type TelegramBotEventInput = z.infer<typeof telegramBotEventSchema>;
