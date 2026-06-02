import { z } from 'zod';

const alertMessages = {
  required: 'Este campo é obrigatório.',
  nameRequired: 'Informe o nome interno do alerta.',
  nameMax: 'O nome deve ter no máximo 120 caracteres.',
  internalTitleMax: 'O título interno deve ter no máximo 160 caracteres.',
  bodyRequired: 'Informe o conteúdo da mensagem.',
  bodyMax: 'A mensagem deve ter no máximo 4096 caracteres.',
  titleMax: 'O título deve ter no máximo 120 caracteres.',
  imageUrl: 'Informe uma URL válida (ex.: https://...).',
  buttonTextRequired: 'Informe o texto do botão.',
  buttonTextMax: 'O texto do botão deve ter no máximo 64 caracteres.',
  buttonUrl: 'URL inválida.',
  buttonsMax: 'É permitido no máximo 8 botões por mensagem.',
  groupIdMin: 'Selecione um grupo válido.',
  threadIdInt: 'O ID do tópico deve ser um número inteiro.',
  threadIdPositive: 'O ID do tópico deve ser maior que zero.',
  membersPerItem: 'Cada membro selecionado deve ser válido.',
  membersMax: 'Selecione no máximo 500 membros.',
  groupsPerItem: 'Cada grupo selecionado deve ser válido.',
  groupsMax: 'Selecione no máximo 200 grupos.',
  rateLimitInt: 'O limite por minuto deve ser um número inteiro.',
  rateLimitMin: 'O limite por minuto deve ser no mínimo 1.',
  rateLimitMax: 'O limite por minuto deve ser no máximo 60.',
  keywordsPerItem: 'Cada palavra-chave deve ser válida.',
  keywordsMax: 'É permitido no máximo 20 palavras-chave.',
  invalidStatus: 'Status do alerta inválido.',
  invalidDestination: 'Tipo de destino inválido.',
  invalidTrigger: 'Tipo de gatilho inválido.',
  invalidQuickSource: 'Origem do aviso rápido inválida.',
  templateNameRequired: 'Informe o nome do modelo.',
  templateNameMax: 'O nome do modelo deve ter no máximo 120 caracteres.',
  templateCategoryRequired: 'Informe a categoria do modelo.',
  templateCategoryMax: 'A categoria deve ter no máximo 60 caracteres.',
  eventTypeRequired: 'Informe o tipo de evento.',
  chatIdRequired: 'Informe o ID do chat.',
  selectGroup: 'Selecione um grupo.',
  selectTopic: 'Selecione ou informe um tópico.',
  selectTopics: 'Selecione ao menos um tópico.',
  threadsPerItem: 'Cada ID de tópico deve ser válido.',
  threadsMax: 'Selecione no máximo 50 tópicos.',
  selectMember: 'Selecione ao menos um membro.',
  selectTrigger: 'Selecione o evento da automação.',
} as const;

export const alertStatusSchema = z.enum(
  ['DRAFT', 'ACTIVE', 'PAUSED', 'FAILED'],
  { message: alertMessages.invalidStatus },
);

export const alertDestinationTypeSchema = z.enum(
  ['GROUP', 'TOPIC', 'MEMBERS', 'QUICK_ALERT', 'AUTOMATION'],
  { message: alertMessages.invalidDestination },
);

export const alertTriggerTypeSchema = z.enum(
  ['MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_BANNED', 'FORUM_TOPIC_CREATED'],
  { message: alertMessages.invalidTrigger },
);

export const alertTableSelectionSourceSchema = z.enum(['MEMBERS', 'GROUPS'], {
  message: alertMessages.invalidQuickSource,
});

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const alertContentSchema = z.object({
  title: z.string().trim().max(120, alertMessages.titleMax).optional(),
  body: z
    .string()
    .trim()
    .min(1, alertMessages.bodyRequired)
    .max(4096, alertMessages.bodyMax),
  imageUrl: z
    .string()
    .trim()
    .refine(isHttpUrl, { message: alertMessages.imageUrl })
    .optional()
    .or(z.literal('')),
  inlineButtons: z
    .array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, alertMessages.buttonTextRequired)
          .max(64, alertMessages.buttonTextMax),
        url: z
          .string()
          .trim()
          .refine(isHttpUrl, { message: alertMessages.buttonUrl }),
      }),
    )
    .max(8, alertMessages.buttonsMax)
    .optional(),
});

export const alertOptionsSchema = z.object({
  silent: z.boolean().default(false),
  pinMessage: z.boolean().default(false),
  mentionUsers: z.boolean().default(false),
  respectLocalTime: z.boolean().default(true),
  autoPauseOnFailure: z.boolean().default(true),
  rateLimitPerMinute: z
    .number({ invalid_type_error: alertMessages.rateLimitInt })
    .int(alertMessages.rateLimitInt)
    .min(1, alertMessages.rateLimitMin)
    .max(60, alertMessages.rateLimitMax)
    .default(20),
});

export const alertTriggerConfigSchema = z
  .object({
    keywords: z
      .array(z.string().trim().min(1, alertMessages.keywordsPerItem))
      .max(20, alertMessages.keywordsMax)
      .optional(),
    tableSelectionSource: alertTableSelectionSourceSchema.optional(),
    targetTelegramGroupIds: z
      .array(z.string().trim().min(1, alertMessages.groupsPerItem))
      .max(200, alertMessages.groupsMax)
      .optional(),
    targetMessageThreadIds: z
      .array(
        z
          .number({ invalid_type_error: alertMessages.threadIdInt })
          .int(alertMessages.threadIdInt)
          .positive(alertMessages.threadIdPositive),
      )
      .max(50, alertMessages.threadsMax)
      .optional(),
  })
  .passthrough();

export const alertUpsertSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, alertMessages.nameRequired)
      .max(120, alertMessages.nameMax),
    internalTitle: z
      .string()
      .trim()
      .max(160, alertMessages.internalTitleMax)
      .optional(),
    status: alertStatusSchema.optional(),
    destinationType: alertDestinationTypeSchema,
    telegramGroupId: z
      .string()
      .trim()
      .min(1, alertMessages.groupIdMin)
      .optional(),
    messageThreadId: z
      .number({ invalid_type_error: alertMessages.threadIdInt })
      .int(alertMessages.threadIdInt)
      .positive(alertMessages.threadIdPositive)
      .optional(),
    content: alertContentSchema,
    options: alertOptionsSchema.default({
      silent: false,
      pinMessage: false,
      mentionUsers: false,
      respectLocalTime: true,
      autoPauseOnFailure: true,
      rateLimitPerMinute: 20,
    }),
    triggerType: alertTriggerTypeSchema.optional(),
    triggerConfig: alertTriggerConfigSchema.optional(),
    targetTelegramUserIds: z
      .array(z.string().trim().min(1, alertMessages.membersPerItem))
      .max(500, alertMessages.membersMax)
      .optional(),
  })
  .superRefine((value, ctx) => {
    const selectedGroupIds = (
      value.triggerConfig?.targetTelegramGroupIds ?? []
    ).filter(Boolean);
    const hasGroupSelection =
      selectedGroupIds.length > 0 || Boolean(value.telegramGroupId);

    if (
      (value.destinationType === 'GROUP' ||
        value.destinationType === 'AUTOMATION') &&
      selectedGroupIds.length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['triggerConfig', 'targetTelegramGroupIds'],
        message: alertMessages.selectGroup,
      });
    }

    if (value.destinationType === 'TOPIC' && !hasGroupSelection) {
      ctx.addIssue({
        code: 'custom',
        path: ['triggerConfig', 'targetTelegramGroupIds'],
        message: alertMessages.selectGroup,
      });
    }

    const selectedTopicIds = (
      value.triggerConfig?.targetMessageThreadIds ?? []
    ).filter((id) => Number.isFinite(id) && id > 0);

    if (
      value.destinationType === 'TOPIC' &&
      selectedTopicIds.length === 0 &&
      !value.messageThreadId
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['triggerConfig', 'targetMessageThreadIds'],
        message: alertMessages.selectTopics,
      });
    }

    if (
      value.destinationType === 'MEMBERS' &&
      (!value.targetTelegramUserIds || value.targetTelegramUserIds.length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetTelegramUserIds'],
        message: alertMessages.selectMember,
      });
    }

    if (value.destinationType === 'AUTOMATION' && !value.triggerType) {
      ctx.addIssue({
        code: 'custom',
        path: ['triggerType'],
        message: alertMessages.selectTrigger,
      });
    }
  });

export const alertListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: alertStatusSchema.optional(),
  destinationType: alertDestinationTypeSchema.optional(),
  groupId: z.string().trim().optional(),
});

export const alertTemplateCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, alertMessages.templateNameRequired)
    .max(120, alertMessages.templateNameMax),
  category: z
    .string()
    .trim()
    .min(1, alertMessages.templateCategoryRequired)
    .max(60, alertMessages.templateCategoryMax),
  content: alertContentSchema,
});

export const alertInternalTriggerSchema = z.object({
  triggerType: alertTriggerTypeSchema,
  chatId: z.string().trim().min(1, alertMessages.chatIdRequired),
  telegramUserId: z.string().trim().optional(),
  messageThreadId: z.coerce.number().int().positive().optional(),
});

export type AlertUpsertInput = z.infer<typeof alertUpsertSchema>;
export type AlertTriggerTypeInput = z.infer<typeof alertTriggerTypeSchema>;

export function toAlertTriggerTypeInput(
  value: string | null | undefined,
): AlertTriggerTypeInput | undefined {
  const parsed = alertTriggerTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export type AlertListQueryInput = z.infer<typeof alertListQuerySchema>;
export type AlertTemplateCreateInput = z.infer<
  typeof alertTemplateCreateSchema
>;
export type AlertContentInput = z.infer<typeof alertContentSchema>;
export type AlertOptionsInput = z.infer<typeof alertOptionsSchema>;
export type AlertInternalTriggerInput = z.infer<
  typeof alertInternalTriggerSchema
>;
