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
  username: optionalTextSchema,
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
    username: optionalTextSchema,
    firstName: optionalTextSchema,
    lastName: optionalTextSchema,
    isBot: z.boolean().optional(),
  }),
  newMemberStatus: telegramBotStatusSchema,
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
]);

export type TelegramBotEventInput = z.infer<typeof telegramBotEventSchema>;
