import { z } from "zod";

const alertMessages = {
  required: "Este campo é obrigatório.",
  nameRequired: "Informe o nome interno do alerta.",
  nameMax: "O nome deve ter no máximo 120 caracteres.",
  internalTitleMax: "O título interno deve ter no máximo 160 caracteres.",
  bodyRequired: "Informe o conteúdo da mensagem.",
  bodyMax: "A mensagem deve ter no máximo 4096 caracteres.",
  titleMax: "O título deve ter no máximo 120 caracteres.",
  imageUrl: "Informe uma URL válida (ex.: https://...).",
  buttonTextRequired: "Informe o texto do botão.",
  buttonTextMax: "O texto do botão deve ter no máximo 64 caracteres.",
  buttonUrl: "URL inválida.",
  buttonsMax: "É permitido no máximo 8 botões por mensagem.",
  groupIdMin: "Selecione um grupo válido.",
  threadIdInt: "O ID do tópico deve ser um número inteiro.",
  threadIdPositive: "O ID do tópico deve ser maior que zero.",
  membersPerItem: "Cada membro selecionado deve ser válido.",
  membersMax: "Selecione no máximo 500 membros.",
  groupsPerItem: "Cada grupo selecionado deve ser válido.",
  groupsMax: "Selecione no máximo 200 grupos.",
  invalidStatus: "Status do alerta inválido.",
  invalidDestination: "Tipo de destino inválido.",
  invalidTrigger: "Tipo de gatilho inválido.",
  invalidQuickSource: "Origem do aviso rápido inválida.",
  selectGroup: "Selecione um grupo.",
  selectTopic: "Selecione ou informe um tópico.",
  selectTopics: "Selecione ao menos um tópico.",
  threadsPerItem: "Cada ID de tópico deve ser válido.",
  threadsMax: "Selecione no máximo 50 tópicos.",
  selectMember: "Selecione ao menos um membro.",
  selectTrigger: "Selecione o evento da automação.",
} as const;

export const alertStatusSchema = z.enum(
  ["DRAFT", "ACTIVE", "PAUSED", "FAILED"],
  { message: alertMessages.invalidStatus },
);

export const alertDestinationTypeSchema = z.enum(
  ["GROUP", "TOPIC", "MEMBERS", "QUICK_ALERT", "AUTOMATION"],
  { message: alertMessages.invalidDestination },
);

export const alertTriggerTypeSchema = z.enum(
  ["MEMBER_JOINED", "MEMBER_LEFT", "MEMBER_BANNED", "FORUM_TOPIC_CREATED"],
  { message: alertMessages.invalidTrigger },
);

export const alertTriggerLabels = {
  MEMBER_JOINED: "Novo membro no grupo",
  MEMBER_LEFT: "Membro saiu do grupo",
  MEMBER_BANNED: "Membro removido ou banido",
  FORUM_TOPIC_CREATED: "Novo tópico no fórum",
} as const satisfies Record<z.infer<typeof alertTriggerTypeSchema>, string>;

export const automationTriggerDescriptions = {
  MEMBER_JOINED:
    "Dispara quando alguém entra no grupo (membro, administrador ou criador).",
  MEMBER_LEFT: "Dispara quando um membro sai voluntariamente do grupo.",
  MEMBER_BANNED:
    "Dispara quando um membro é removido ou banido (status expulso no Telegram).",
  FORUM_TOPIC_CREATED:
    "Dispara quando um novo tópico é criado em um grupo com fórum habilitado.",
} as const satisfies Record<z.infer<typeof alertTriggerTypeSchema>, string>;

export const alertTableSelectionSourceSchema = z.enum(["MEMBERS", "GROUPS"], {
  message: alertMessages.invalidQuickSource,
});

export const alertRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
]);

export const alertDeliveryStatusSchema = z.enum(["SENT", "FAILED", "SKIPPED"]);

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const alertInlineButtonFormSchema = z.object({
  text: z.string(),
  url: z.string(),
});

function refineInlineButtons(
  buttons: z.infer<typeof alertInlineButtonFormSchema>[] | undefined,
  ctx: z.RefinementCtx,
) {
  if (!buttons?.length) return;

  for (const [index, button] of buttons.entries()) {
    const text = button.text.trim();
    const url = button.url.trim();

    if (!text && !url) continue;

    if (!text) {
      ctx.addIssue({
        code: "custom",
        message: alertMessages.buttonTextRequired,
        path: ["inlineButtons", index, "text"],
      });
    } else if (text.length > 64) {
      ctx.addIssue({
        code: "custom",
        message: alertMessages.buttonTextMax,
        path: ["inlineButtons", index, "text"],
      });
    }

    if (!url) {
      ctx.addIssue({
        code: "custom",
        message: alertMessages.buttonUrl,
        path: ["inlineButtons", index, "url"],
      });
    } else if (!isHttpUrl(url)) {
      ctx.addIssue({
        code: "custom",
        message: alertMessages.buttonUrl,
        path: ["inlineButtons", index, "url"],
      });
    }
  }
}

export const alertContentSchema = z
  .object({
    title: z.string().trim().max(120, alertMessages.titleMax).optional(),
    body: z
      .string()
      .trim()
      .min(1, alertMessages.bodyRequired)
      .max(4096, alertMessages.bodyMax),
    imageUrl: z
      .string()
      .trim()
      .refine(isHttpUrl, alertMessages.imageUrl)
      .optional()
      .or(z.literal("")),
    inlineButtons: z
      .array(alertInlineButtonFormSchema)
      .max(8, alertMessages.buttonsMax)
      .optional(),
  })
  .superRefine((content, ctx) => {
    refineInlineButtons(content.inlineButtons, ctx);
  });

export const alertOptionsSchema = z.object({
  silent: z.boolean().default(false),
  pinMessage: z.boolean().default(false),
  mentionUsers: z.boolean().default(false),
  respectLocalTime: z.boolean().default(true),
  autoPauseOnFailure: z.boolean().default(true),
});

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
      .number({ message: alertMessages.threadIdInt })
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
    }),
    triggerType: alertTriggerTypeSchema.optional(),
    triggerConfig: z
      .object({
        tableSelectionSource: alertTableSelectionSourceSchema.optional(),
        targetTelegramGroupIds: z
          .array(z.string().trim().min(1, alertMessages.groupsPerItem))
          .max(200, alertMessages.groupsMax)
          .optional(),
        targetMessageThreadIds: z
          .array(
            z
              .number({ message: alertMessages.threadIdInt })
              .int(alertMessages.threadIdInt)
              .positive(alertMessages.threadIdPositive),
          )
          .max(50, alertMessages.threadsMax)
          .optional(),
      })
      .passthrough()
      .optional(),
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
      (value.destinationType === "GROUP" ||
        value.destinationType === "AUTOMATION") &&
      selectedGroupIds.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerConfig", "targetTelegramGroupIds"],
        message: alertMessages.selectGroup,
      });
    }

    if (value.destinationType === "TOPIC" && !hasGroupSelection) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerConfig", "targetTelegramGroupIds"],
        message: alertMessages.selectGroup,
      });
    }

    const selectedTopicIds = (
      value.triggerConfig?.targetMessageThreadIds ?? []
    ).filter((id) => Number.isFinite(id) && id > 0);

    if (
      value.destinationType === "TOPIC" &&
      selectedTopicIds.length === 0 &&
      !value.messageThreadId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerConfig", "targetMessageThreadIds"],
        message: alertMessages.selectTopics,
      });
    }

    if (
      value.destinationType === "MEMBERS" &&
      (!value.targetTelegramUserIds || value.targetTelegramUserIds.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["targetTelegramUserIds"],
        message: alertMessages.selectMember,
      });
    }

    if (value.destinationType === "AUTOMATION" && !value.triggerType) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerType"],
        message: alertMessages.selectTrigger,
      });
    }
  });

export const alertSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  telegramGroupId: z.string().nullable(),
  name: z.string(),
  internalTitle: z.string().nullable(),
  status: alertStatusSchema,
  destinationType: alertDestinationTypeSchema,
  messageThreadId: z.number().nullable(),
  content: alertContentSchema,
  options: alertOptionsSchema,
  triggerType: alertTriggerTypeSchema.nullable(),
  triggerConfig: z.unknown().nullable(),
  deliveryRate: z.number(),
  lastRunAt: z.string().nullable().or(z.date().nullable()),
  createdByUserId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  recipientCount: z.number().nullable(),
  group: z
    .object({
      id: z.string(),
      title: z.string().nullable(),
      botStatus: z.string(),
    })
    .nullable(),
  lastRun: z
    .object({
      id: z.string(),
      status: alertRunStatusSchema,
      successCount: z.number(),
      failCount: z.number(),
      startedAt: z.string().nullable().or(z.date().nullable()),
      finishedAt: z.string().nullable().or(z.date().nullable()),
    })
    .nullable()
    .optional(),
  targets: z
    .array(
      z.object({
        telegramUserId: z.string(),
      }),
    )
    .optional(),
});

export const alertsResponseSchema = z.object({
  alerts: z.array(alertSummarySchema),
  stats: z.object({
    activeCount: z.number(),
    sentToday: z.number(),
    deliveryRate: z.number(),
    draftCount: z.number(),
  }),
});

export const alertRunRecordSchema = z.object({
  id: z.string(),
  alertId: z.string(),
  status: alertRunStatusSchema,
  estimatedCount: z.number(),
  successCount: z.number(),
  failCount: z.number(),
  startedAt: z.string().nullable().or(z.date().nullable()),
  finishedAt: z.string().nullable().or(z.date().nullable()),
  error: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
});

export const alertRunListSchema = z.array(alertRunRecordSchema);

export const alertDeliveryRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  telegramUserId: z.string().nullable(),
  chatId: z.string().nullable(),
  threadId: z.number().nullable(),
  status: alertDeliveryStatusSchema,
  error: z.string().nullable(),
  sentAt: z.string().nullable().or(z.date().nullable()),
  createdAt: z.string().or(z.date()),
});

export const alertDeliveryListSchema = z.array(alertDeliveryRecordSchema);

export const alertTemplateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  category: z.string(),
  content: alertContentSchema,
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type AlertUpsertInput = z.infer<typeof alertUpsertSchema>;
export type AlertStatus = z.infer<typeof alertStatusSchema>;
export type AlertDestinationType = z.infer<typeof alertDestinationTypeSchema>;
export type AlertTriggerType = z.infer<typeof alertTriggerTypeSchema>;
export type AlertTableSelectionSource = z.infer<
  typeof alertTableSelectionSourceSchema
>;
export type AlertSummaryDto = z.infer<typeof alertSummarySchema>;
export type AlertsResponseDto = z.infer<typeof alertsResponseSchema>;
export type AlertTemplateDto = z.infer<typeof alertTemplateSchema>;
export type AlertRunRecordDto = z.infer<typeof alertRunRecordSchema>;
export type AlertDeliveryRecordDto = z.infer<typeof alertDeliveryRecordSchema>;

export const alertRunStatusLabels: Record<
  z.infer<typeof alertRunStatusSchema>,
  string
> = {
  PENDING: "Pendente",
  RUNNING: "Em execução",
  COMPLETED: "Concluída",
  PARTIAL: "Parcial",
  FAILED: "Falhou",
  CANCELLED: "Cancelada",
};

export function getAlertTargetGroupIds(alert: {
  telegramGroupId?: string | null;
  triggerConfig?: unknown;
}): string[] {
  const config = alert.triggerConfig as
    | { targetTelegramGroupIds?: string[] }
    | null
    | undefined;
  const fromConfig = (config?.targetTelegramGroupIds ?? []).filter(Boolean);
  if (fromConfig.length > 0) return fromConfig;
  return alert.telegramGroupId ? [alert.telegramGroupId] : [];
}

export function resolveAlertTriggerLabel(
  triggerType: string | null | undefined,
): string | undefined {
  const parsed = alertTriggerTypeSchema.safeParse(triggerType);
  return parsed.success ? alertTriggerLabels[parsed.data] : undefined;
}
