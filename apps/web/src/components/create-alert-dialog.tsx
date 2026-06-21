"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import {
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type FieldPath,
  type Resolver,
  type UseFormReturn,
  useForm,
  useFormState,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { ZodError } from "zod";
import {
  getMemberDisplayName,
  getMemberInitials,
} from "@/app/(private)/members/_components/members-table-helpers";
import stripeLogo from "@/assets/gateway/stripe-4.svg";
import { ForumTopicSelectField } from "@/components/forum-topic-select-field";
import {
  ArrowLeftIcon,
  type ArrowLeftIconHandle,
} from "@/components/icons/arrow-left";
import {
  ArrowRightIcon,
  type ArrowRightIconHandle,
} from "@/components/icons/arrow-right";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { BanIcon } from "@/components/icons/ban";
import { MessageCircleIcon } from "@/components/icons/message-circle";
import { PlusIcon, type PlusIconHandle } from "@/components/icons/plus";
import { SlidersHorizontalIcon } from "@/components/icons/sliders-horizontal";
import { UserRoundMinusIcon } from "@/components/icons/user-round-minus";
import { UsersIcon } from "@/components/icons/users";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { ImageComponent } from "@/components/image-component";
import {
  DialogStack,
  DialogStackBody,
  DialogStackContent,
  DialogStackDescription,
  DialogStackFooter,
  DialogStackHeader,
  DialogStackOverlay,
  DialogStackPrevious,
  DialogStackProgress,
  DialogStackTitle,
  DialogStackTrigger,
  useDialogStackNavigation,
} from "@/components/kibo-ui/dialog-stack";
import {
  AlertReviewSummary,
  formatReviewBoolean,
  formatReviewValue,
} from "@/components/alert-review-summary";
import { SelectableOptionCard } from "@/components/selectable-option-card";
import { StripePrivateMessageBadge } from "@/components/stripe-private-message-badge";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IconAnimationHandle } from "@/hooks/use-icon-animation";
import {
  DEFAULT_ALERT_FORM_VALUES,
  mapAlertSummaryToFormValues,
} from "@/lib/alert-form-values";
import { cn, withCacheBuster } from "@/lib/utils";
import {
  type AlertDestinationType,
  type AlertSummaryDto,
  type AlertTriggerType,
  type AlertUpsertInput,
  alertTriggerLabels,
  alertUpsertSchema,
  automationTriggerDescriptions,
  isStripeAutomationTriggerType,
  memberAutomationTriggerTypes,
} from "@/lib/zod/alert-schemas";
import type { StripeBillingConnectionDto } from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

const destinationLabels: Record<AlertDestinationType, string> = {
  GROUP: "Grupo inteiro",
  TOPIC: "Tópico específico de um grupo",
  MEMBERS: "Membros com permissão de envio",
  QUICK_ALERT: "Aviso Rápido",
  AUTOMATION: "Automação inteligente",
};

function formatTopicReviewSummary(
  threadIds: number[],
  topicNamesById: Record<number, string>,
): string | undefined {
  if (threadIds.length === 0) return undefined;

  return threadIds
    .map((threadId) => {
      const name = topicNamesById[threadId]?.trim();
      return name || `ID ${threadId}`;
    })
    .join(", ");
}

function formatStripeConnectionLabel(connection: StripeBillingConnectionDto) {
  const planLabel = connection.monitoredPlanLabel?.trim() || "Plano Stripe";
  return `${planLabel} ···${connection.apiKeyLast4}`;
}

function buildDestinationAudienceFields({
  destinationType,
  groupsSummary,
  topicsSummary,
  targetMembersCount,
  automationEventLabel,
  stripePlanLabel,
}: {
  destinationType?: AlertDestinationType;
  groupsSummary?: string;
  topicsSummary?: string;
  targetMembersCount: number;
  automationEventLabel?: string;
  stripePlanLabel?: string;
}): { label: string; value: string }[] {
  if (!destinationType) return [];

  switch (destinationType) {
    case "GROUP":
      return [{ label: "Grupo(s)", value: formatReviewValue(groupsSummary) }];
    case "AUTOMATION":
      return [
        {
          label: "Evento",
          value: formatReviewValue(automationEventLabel),
        },
        ...(stripePlanLabel
          ? [
              {
                label: "Plano Stripe",
                value: formatReviewValue(stripePlanLabel),
              },
            ]
          : []),
        { label: "Grupo(s)", value: formatReviewValue(groupsSummary) },
      ];
    case "TOPIC":
      return [
        { label: "Grupo", value: formatReviewValue(groupsSummary) },
        {
          label: "Tópicos",
          value: formatReviewValue(topicsSummary),
        },
      ];
    case "MEMBERS":
      return [
        {
          label: "Membros selecionados",
          value: formatReviewValue(
            targetMembersCount > 0 ? String(targetMembersCount) : undefined,
          ),
        },
      ];
    case "QUICK_ALERT":
      return [
        {
          label: "Uso",
          value: "Modelo reutilizável nas tabelas de membros e grupos",
        },
      ];
    default:
      return [];
  }
}

type DestinationOptionIconProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
  isAnimateOnView?: boolean;
  strokeWidth?: number;
};

type DestinationOptionIcon = ForwardRefExoticComponent<
  DestinationOptionIconProps & RefAttributes<IconAnimationHandle>
>;

type AlertDestinationOption = {
  value: AlertDestinationType;
  title: string;
  description: string;
  alert?: string;
  icon: DestinationOptionIcon;
};

const destinationOptions: AlertDestinationOption[] = [
  {
    value: "GROUP",
    title: "Grupos",
    description: "Envie uma notificação diretamente para um grupo conectado.",
    icon: UsersIcon,
  },
  {
    value: "TOPIC",
    title: "Tópicos",
    description:
      "Publique mensagens em um tópico específico de um grupo conectado.",
    icon: MessageCircleIcon,
  },
  {
    value: "MEMBERS",
    title: "Membros",
    description:
      "Selecione manualmente os membros autorizados a receber mensagens.",
    alert:
      "As mensagens serão enviadas apenas para membros que já iniciaram uma conversa com o bot.",
    icon: UsersIcon,
  },
  {
    value: "QUICK_ALERT",
    title: "Alerta rápido",
    description:
      "Crie modelos de alertas rápidos para reutilizar em grupos e membros.",
    icon: SlidersHorizontalIcon,
  },
  {
    value: "AUTOMATION",
    title: "Automação",
    description:
      "Mensagens automáticas disparadas por eventos do grupo ou integrações conectadas.",
    icon: BadgeAlertIcon,
  },
];

const automationTriggerOptions: {
  value: AlertTriggerType;
  title: string;
  description: string;
  icon?: DestinationOptionIcon;
  logo?: typeof stripeLogo;
}[] = [
  {
    value: "MEMBER_JOINED",
    title: "Novo membro",
    description: automationTriggerDescriptions.MEMBER_JOINED,
    icon: UsersIcon,
  },
  {
    value: "MEMBER_JOINED_GROUP_MESSAGE",
    title: "Mensagem de boas-vindas",
    description: automationTriggerDescriptions.MEMBER_JOINED_GROUP_MESSAGE,
    icon: UsersIcon,
  },
  {
    value: "MEMBER_LEFT",
    title: "Membro saiu",
    description: automationTriggerDescriptions.MEMBER_LEFT,
    icon: UserRoundMinusIcon,
  },
  {
    value: "MEMBER_LEFT_PRIVATE_MESSAGE",
    title: "Mensagem de despedida",
    description: automationTriggerDescriptions.MEMBER_LEFT_PRIVATE_MESSAGE,
    icon: MessageCircleIcon,
  },
  {
    value: "MEMBER_BANNED",
    title: "Removido / banido",
    description: automationTriggerDescriptions.MEMBER_BANNED,
    icon: BanIcon,
  },
  {
    value: "FORUM_TOPIC_CREATED",
    title: "Novo tópico",
    description: automationTriggerDescriptions.FORUM_TOPIC_CREATED,
    icon: MessageCircleIcon,
  },
  {
    value: "STRIPE_PAYMENT_SUCCEEDED",
    title: "Pagamento recebido",
    description: automationTriggerDescriptions.STRIPE_PAYMENT_SUCCEEDED,
    logo: stripeLogo,
  },
  {
    value: "STRIPE_PAYMENT_FAILED",
    title: "Pagamento falhou",
    description: automationTriggerDescriptions.STRIPE_PAYMENT_FAILED,
    logo: stripeLogo,
  },
  {
    value: "STRIPE_SUBSCRIPTION_EXPIRING",
    title: "Vencimento próximo",
    description: automationTriggerDescriptions.STRIPE_SUBSCRIPTION_EXPIRING,
    logo: stripeLogo,
  },
  {
    value: "STRIPE_SUBSCRIPTION_EXPIRED",
    title: "Assinatura expirada",
    description: automationTriggerDescriptions.STRIPE_SUBSCRIPTION_EXPIRED,
    logo: stripeLogo,
  },
  {
    value: "STRIPE_SUBSCRIPTION_RENEWED",
    title: "Assinatura renovada",
    description: automationTriggerDescriptions.STRIPE_SUBSCRIPTION_RENEWED,
    logo: stripeLogo,
  },
  {
    value: "STRIPE_SUBSCRIPTION_CANCELED",
    title: "Assinatura cancelada",
    description: automationTriggerDescriptions.STRIPE_SUBSCRIPTION_CANCELED,
    logo: stripeLogo,
  },
];

const dialogProgressSteps = [
  { id: "destination", label: "Destino" },
  { id: "details", label: "Detalhes" },
  { id: "review", label: "Revisão" },
] as const;

type CreateAlertWizardStep = {
  title: string;
  description: string;
  content: ReactNode;
  showNextButton?: boolean;
  showPreviousButton?: boolean;
};

type AutomationTriggerIconRefsMap = Partial<
  Record<AlertTriggerType, IconAnimationHandle | null>
>;

type CreateAlertDialogProps = {
  groups: TelegramGroupSummaryDto[];
  stripeConnections: StripeBillingConnectionDto[];
  onCreated: () => void;
  buttonText?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  alertToEdit?: AlertSummaryDto | null;
};

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function AlertFieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {children}
      {required ? <RequiredMark /> : null}
    </FieldLabel>
  );
}

function applyZodIssuesToForm(
  form: UseFormReturn<AlertUpsertInput>,
  zodError: ZodError,
): FieldPath<AlertUpsertInput> | null {
  form.clearErrors();
  let firstPath: FieldPath<AlertUpsertInput> | null = null;
  for (const issue of zodError.issues) {
    if (issue.path.length === 0) continue;
    const path = issue.path.join(".") as FieldPath<AlertUpsertInput>;
    if (!firstPath) firstPath = path;
    form.setError(path, { type: "custom", message: issue.message });
  }
  return firstPath;
}

function scrollToFirstInvalidField(form: UseFormReturn<AlertUpsertInput>) {
  requestAnimationFrame(() => {
    const firstInvalidElement = document.querySelector<HTMLElement>(
      "[aria-invalid='true']",
    );
    if (firstInvalidElement) {
      firstInvalidElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      firstInvalidElement.focus?.();
      return;
    }

    const firstErrorPath = Object.keys(form.formState.errors)[0] as
      | FieldPath<AlertUpsertInput>
      | undefined;
    if (firstErrorPath) {
      form.setFocus(firstErrorPath);
    }
  });
}

function stripEmptyInlineButtons(
  content: AlertUpsertInput["content"],
): AlertUpsertInput["content"] {
  const buttons = content.inlineButtons;
  if (!buttons?.length) return content;

  const filled = buttons
    .map((button) => ({
      text: button.text.trim(),
      url: button.url.trim(),
    }))
    .filter((button) => button.text.length > 0 || button.url.length > 0);

  return {
    ...content,
    inlineButtons: filled.length > 0 ? filled : undefined,
  };
}

function getCreateAlertSuccessToast(
  status: "DRAFT" | "ACTIVE",
  destinationType: AlertDestinationType,
): { title: string; description: string } {
  if (status === "DRAFT") {
    return {
      title: "Rascunho salvo",
      description: "O alerta foi salvo. Publique quando quiser ativá-lo.",
    };
  }

  switch (destinationType) {
    case "QUICK_ALERT":
      return {
        title: "Modelo criado",
        description: "Use este alerta rápido nas tabelas de membros ou grupos.",
      };
    case "AUTOMATION":
      return {
        title: "Automação publicada",
        description:
          "As mensagens serão enviadas quando o evento ocorrer nos grupos monitorados.",
      };
    default:
      return {
        title: "Alerta criado com sucesso",
        description:
          "O envio para o destino configurado será iniciado em breve.",
      };
  }
}

function getUpdateAlertSuccessToast(
  status: AlertSummaryDto["status"],
  destinationType: AlertDestinationType,
): { title: string; description: string } {
  if (status === "DRAFT") {
    return {
      title: "Rascunho atualizado",
      description: "As alterações foram salvas no rascunho.",
    };
  }

  switch (destinationType) {
    case "QUICK_ALERT":
      return {
        title: "Modelo atualizado",
        description: "O aviso rápido foi atualizado com as novas configurações.",
      };
    case "AUTOMATION":
      return {
        title: "Automação atualizada",
        description: "As alterações serão aplicadas nas próximas execuções.",
      };
    default:
      return {
        title: "Alerta atualizado",
        description: "As alterações foram salvas com sucesso.",
      };
  }
}

function lockDestinationFields(
  values: AlertUpsertInput,
  locked: AlertUpsertInput,
): AlertUpsertInput {
  return {
    ...values,
    destinationType: locked.destinationType,
    telegramGroupId: locked.telegramGroupId,
    messageThreadId: locked.messageThreadId,
    targetTelegramUserIds: locked.targetTelegramUserIds,
    triggerType: locked.triggerType,
    triggerConfig: {
      ...(values.triggerConfig ?? {}),
      targetTelegramGroupIds: locked.triggerConfig?.targetTelegramGroupIds,
      targetMessageThreadIds: locked.triggerConfig?.targetMessageThreadIds,
      stripeConnectionId: locked.triggerConfig?.stripeConnectionId,
    },
  };
}

function normalizeAlertFormValues(values: AlertUpsertInput): AlertUpsertInput {
  const configuredGroupIds = (
    values.triggerConfig?.targetTelegramGroupIds ?? []
  ).filter(Boolean);
  const groupIds =
    configuredGroupIds.length > 0
      ? configuredGroupIds
      : values.telegramGroupId
        ? [values.telegramGroupId]
        : [];
  const primaryGroupId = groupIds[0];
  const topicIds = (values.triggerConfig?.targetMessageThreadIds ?? []).filter(
    (threadId) => Number.isFinite(threadId) && threadId > 0,
  );
  const baseTriggerConfig = {
    ...(values.triggerConfig ?? {}),
    tableSelectionSource: undefined,
  };
  const withStrippedButtons: AlertUpsertInput = {
    ...values,
    content: stripEmptyInlineButtons(values.content),
  };

  if (withStrippedButtons.destinationType === "QUICK_ALERT") {
    return {
      ...withStrippedButtons,
      telegramGroupId: undefined,
      messageThreadId: undefined,
      targetTelegramUserIds: [],
      triggerType: undefined,
      triggerConfig: {
        ...baseTriggerConfig,
        targetTelegramGroupIds: [],
        targetMessageThreadIds: [],
      },
    };
  }

  if (withStrippedButtons.destinationType === "MEMBERS") {
    return {
      ...withStrippedButtons,
      telegramGroupId: undefined,
      messageThreadId: undefined,
      triggerType: undefined,
      triggerConfig: {
        ...baseTriggerConfig,
        targetTelegramGroupIds: [],
        targetMessageThreadIds: [],
      },
    };
  }

  if (withStrippedButtons.destinationType === "TOPIC") {
    return {
      ...withStrippedButtons,
      telegramGroupId: primaryGroupId,
      messageThreadId: topicIds[0],
      targetTelegramUserIds: [],
      triggerType: undefined,
      triggerConfig: {
        ...baseTriggerConfig,
        targetTelegramGroupIds: primaryGroupId ? [primaryGroupId] : [],
        targetMessageThreadIds: topicIds,
      },
    };
  }

  if (withStrippedButtons.destinationType === "AUTOMATION") {
    return {
      ...withStrippedButtons,
      telegramGroupId: primaryGroupId,
      messageThreadId: undefined,
      targetTelegramUserIds: [],
      triggerConfig: {
        ...baseTriggerConfig,
        targetTelegramGroupIds: groupIds,
        targetMessageThreadIds: [],
      },
    };
  }

  return {
    ...withStrippedButtons,
    telegramGroupId: primaryGroupId,
    messageThreadId: undefined,
    targetTelegramUserIds: [],
    triggerType: undefined,
    triggerConfig: {
      ...baseTriggerConfig,
      targetTelegramGroupIds: groupIds,
      targetMessageThreadIds: [],
    },
  };
}

function resetAudienceFields(form: UseFormReturn<AlertUpsertInput>) {
  form.setValue("telegramGroupId", undefined, {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.setValue("messageThreadId", undefined, {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.setValue("triggerConfig.targetTelegramGroupIds", [], {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.setValue("triggerConfig.targetMessageThreadIds", [], {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.setValue("triggerConfig.tableSelectionSource", undefined, {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.setValue("targetTelegramUserIds", [], {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.setValue("triggerType", undefined, {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.setValue("triggerConfig.stripeConnectionId", undefined, {
    shouldDirty: true,
    shouldValidate: false,
  });
  form.clearErrors();
}

function validateAlertDetailsStep(
  form: UseFormReturn<AlertUpsertInput>,
): boolean {
  const values = normalizeAlertFormValues(form.getValues());
  const normalizedGroupIds = (
    values.triggerConfig?.targetTelegramGroupIds ?? []
  ).filter(Boolean);
  const normalizedPrimaryGroupId =
    normalizedGroupIds[0] ?? values.telegramGroupId;
  const result = alertUpsertSchema.safeParse({
    ...values,
    telegramGroupId:
      values.destinationType === "MEMBERS" ||
      values.destinationType === "QUICK_ALERT"
        ? undefined
        : normalizedPrimaryGroupId,
    triggerConfig: {
      ...(values.triggerConfig ?? {}),
      targetTelegramGroupIds: normalizedGroupIds,
    },
    status: values.status ?? "DRAFT",
  });

  if (result.success) {
    form.clearErrors();
    return true;
  }

  applyZodIssuesToForm(form, result.error);
  scrollToFirstInvalidField(form);
  return false;
}

type ActiveGroupMember = NonNullable<
  TelegramGroupSummaryDto["members"]
>[number];

type AggregatedMemberRow = {
  rowKey: string;
  member: ActiveGroupMember;
  groupTitles: string[];
};

function buildActiveMembersAcrossGroups(
  groups: TelegramGroupSummaryDto[],
): AggregatedMemberRow[] {
  const byUserId = new Map<string, AggregatedMemberRow>();

  for (const group of groups) {
    const groupTitle = group.title?.trim() || group.telegramChatId;

    for (const member of group.members) {
      if (member.status !== "active") continue;

      const existing = byUserId.get(member.telegramUserId);
      if (existing) {
        if (!existing.groupTitles.includes(groupTitle)) {
          existing.groupTitles.push(groupTitle);
        }
        if (!existing.member.profilePhotoUrl && member.profilePhotoUrl) {
          existing.member = member;
        }
        continue;
      }

      byUserId.set(member.telegramUserId, {
        rowKey: member.telegramUserId,
        member,
        groupTitles: [groupTitle],
      });
    }
  }

  return [...byUserId.values()].sort((left, right) => {
    const nameCompare = getMemberDisplayName(left.member)
      .toLocaleLowerCase("pt-BR")
      .localeCompare(
        getMemberDisplayName(right.member).toLocaleLowerCase("pt-BR"),
        "pt-BR",
      );
    if (nameCompare !== 0) return nameCompare;
    const leftGroup = left.groupTitles[0] ?? "";
    const rightGroup = right.groupTitles[0] ?? "";
    return leftGroup.localeCompare(rightGroup, "pt-BR");
  });
}

type MemberAcrossGroupsCheckboxListProps = {
  form: UseFormReturn<AlertUpsertInput>;
  groups: TelegramGroupSummaryDto[];
  selectedUserIds: string[];
  legendId: string;
  emptyMessageId: string;
  fieldIdPrefix: string;
  legend: string;
  description?: string;
  required?: boolean;
  error?: string;
};

function MemberAcrossGroupsCheckboxList({
  form,
  groups,
  selectedUserIds,
  legendId,
  emptyMessageId,
  fieldIdPrefix,
  legend,
  description,
  required,
  error,
}: MemberAcrossGroupsCheckboxListProps) {
  const memberRows = useMemo(
    () => buildActiveMembersAcrossGroups(groups),
    [groups],
  );

  return (
    <Field data-invalid={error ? true : undefined}>
      <AlertFieldLabel required={required}>
        <span id={legendId}>{legend}</span>
      </AlertFieldLabel>
      {description ? (
        <FieldDescription id={`${legendId}-desc`}>
          {description}
        </FieldDescription>
      ) : null}
      {memberRows.length > 0 ? (
        <ul
          aria-labelledby={legendId}
          aria-describedby={description ? `${legendId}-desc` : undefined}
          aria-label={`${legend}: ${selectedUserIds.length} de ${memberRows.length} selecionado(s)`}
          aria-invalid={Boolean(error)}
          className={cn(
            "max-h-64 list-none overflow-y-auto rounded-lg border ring-offset-[1.5px] dark:ring-offset-neutral-800",
            error
              ? "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
              : "border-border",
          )}
        >
          {memberRows.map((row, index) => {
            const { member, groupTitles, rowKey } = row;
            const checkboxId = `${fieldIdPrefix}-member-${rowKey}`;
            const displayName = getMemberDisplayName(member);
            const groupsLabel = groupTitles.join(", ");
            const isSelected = selectedUserIds.includes(member.telegramUserId);

            return (
              <li
                key={rowKey}
                className={cn(index > 0 && "border-border border-t")}
              >
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5",
                    "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    id={checkboxId}
                    className="group-has-disabled/field:opacity-100"
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      const next = isChecked
                        ? [
                            ...new Set([
                              ...selectedUserIds,
                              member.telegramUserId,
                            ]),
                          ]
                        : selectedUserIds.filter(
                            (id) => id !== member.telegramUserId,
                          );
                      form.setValue("targetTelegramUserIds", next, {
                        shouldDirty: true,
                        shouldValidate: false,
                      });
                      if (next.length > 0) {
                        form.clearErrors("targetTelegramUserIds");
                      }
                    }}
                  />
                  <ImageComponent
                    src={member.profilePhotoUrl}
                    alt={displayName}
                    width={36}
                    height={36}
                    sizes="36px"
                    fallback={
                      <span className="font-semibold text-xs uppercase">
                        {getMemberInitials(member)}
                      </span>
                    }
                    className="size-9 shrink-0 rounded-full border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground! text-sm">
                      {displayName}
                    </span>
                    <p className="truncate text-muted-foreground text-xs">
                      {groupsLabel}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          id={emptyMessageId}
          aria-live="polite"
          className="text-muted-foreground text-sm"
        >
          Nenhum membro ativo encontrado nos seus grupos.
        </p>
      )}
      {selectedUserIds.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {selectedUserIds.length} membro(s) selecionado(s)
        </p>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function formatGroupMemberCount(group: TelegramGroupSummaryDto) {
  const count = group.memberCount ?? group.trackedMemberCount ?? 0;
  return `${count.toLocaleString("pt-BR")} membro${count === 1 ? "" : "s"}`;
}

type AutomationEventSelectFieldProps = {
  form: UseFormReturn<AlertUpsertInput>;
  groups: TelegramGroupSummaryDto[];
  selectedGroupIds: string[];
  fieldIds: string;
  error?: string;
};

function selectedGroupsIncludeForum(
  groups: TelegramGroupSummaryDto[],
  selectedGroupIds: string[],
): boolean {
  return selectedGroupIds.some((groupId) => {
    const group = groups.find((item) => item.id === groupId);
    return group?.isForum === true;
  });
}

function AutomationEventSelectField({
  form,
  fieldIds,
  groups,
  selectedGroupIds,
  error,
}: AutomationEventSelectFieldProps) {
  const triggerType = useWatch({ control: form.control, name: "triggerType" });
  const iconRefs = useRef<AutomationTriggerIconRefsMap>({});
  const legendId = `${fieldIds}-automation-event-legend`;
  const descriptionId = `${fieldIds}-automation-event-desc`;

  const showForumTopicEvent = selectedGroupsIncludeForum(
    groups,
    selectedGroupIds,
  );

  const visibleEventOptions = automationTriggerOptions.filter(
    (option) => option.value !== "FORUM_TOPIC_CREATED" || showForumTopicEvent,
  );

  useEffect(() => {
    if (triggerType === "FORUM_TOPIC_CREATED" && !showForumTopicEvent) {
      form.setValue("triggerType", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, showForumTopicEvent, triggerType]);

  function playEventIconAnimation(value: AlertTriggerType) {
    iconRefs.current[value]?.startAnimation();
  }

  function stopEventIconAnimation(value: AlertTriggerType) {
    iconRefs.current[value]?.stopAnimation();
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <AlertFieldLabel required>
        <span id={legendId}>Evento</span>
      </AlertFieldLabel>
      <FieldDescription id={descriptionId}>
        Escolha quando o alerta deve ser enviado automaticamente nos grupos
        selecionados.
      </FieldDescription>
      <ul
        aria-labelledby={legendId}
        aria-describedby={descriptionId}
        aria-label={`Evento: ${triggerType ? 1 : 0} de ${visibleEventOptions.length} selecionado`}
        aria-invalid={Boolean(error)}
        className={cn(
          "max-h-64 list-none overflow-y-auto rounded-lg border ring-offset-[1.5px] dark:ring-offset-neutral-800",
          error
            ? "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
            : "border-border",
        )}
      >
        {visibleEventOptions.map(
          ({ value, title, description, icon: Icon, logo }, index) => {
            const checkboxId = `${fieldIds}-automation-event-${value}`;
            const isSelected = triggerType === value;

            return (
              <li
                key={value}
                className={cn(index > 0 && "border-border border-t")}
                onMouseEnter={() => {
                  if (Icon) playEventIconAnimation(value);
                }}
                onMouseLeave={() => {
                  if (Icon) stopEventIconAnimation(value);
                }}
              >
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5",
                    "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    id={checkboxId}
                    className="group-has-disabled/field:opacity-100"
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        form.setValue("triggerType", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        form.clearErrors("triggerType");
                        return;
                      }
                      form.setValue("triggerType", undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                  <div
                    className={cn(
                      "inline-flex size-9 shrink-0 bg-primary/10 items-center justify-center border border-border",
                      logo ? "rounded-lg px-1.5" : "rounded-full text-primary",
                    )}
                    aria-hidden="true"
                  >
                    {logo ? (
                      <Image
                        src={logo}
                        alt="Stripe"
                        className="max-h-5 w-auto object-contain"
                      />
                    ) : Icon ? (
                      <Icon
                        ref={(instance) => {
                          iconRefs.current[value] = instance;
                        }}
                        size={16}
                        isAnimateOnView={false}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <TruncatedTextTooltip
                        text={title}
                        className="min-w-0 font-medium text-foreground! text-sm"
                      />
                      {logo ? <StripePrivateMessageBadge /> : null}
                    </div>
                    <TruncatedTextTooltip
                      text={description}
                      className="text-muted-foreground text-xs"
                    />
                  </div>
                </label>
              </li>
            );
          },
        )}
      </ul>
      {triggerType ? (
        <p className="text-muted-foreground text-xs">1 evento selecionado</p>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

type StripePlanSelectFieldProps = {
  form: UseFormReturn<AlertUpsertInput>;
  stripeConnections: StripeBillingConnectionDto[];
  fieldIds: string;
  error?: string;
};

function StripePlanSelectField({
  form,
  stripeConnections,
  fieldIds,
  error,
}: StripePlanSelectFieldProps) {
  const selectedConnectionId = useWatch({
    control: form.control,
    name: "triggerConfig.stripeConnectionId",
  });
  const legendId = `${fieldIds}-stripe-plan-legend`;
  const descriptionId = `${fieldIds}-stripe-plan-desc`;

  return (
    <Field data-invalid={error ? true : undefined}>
      <AlertFieldLabel required>
        <span className="inline-flex items-center gap-2">
          <span id={legendId}>Plano Stripe</span>
          <StripePrivateMessageBadge />
        </span>
      </AlertFieldLabel>
      <FieldDescription id={descriptionId}>
        Escolha qual integração e plano monitorado devem disparar este alerta.
      </FieldDescription>
      {stripeConnections.length === 0 ? (
        <FieldDescription className="rounded-lg text-center gap-y-1 h-28 flex flex-col items-center justify-center border border-border p-3 text-sm">
          <span>Nenhum plano Stripe conectado.</span>
          <Link
            href="/integrations"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Conectar na página de integrações
          </Link>
        </FieldDescription>
      ) : (
        <FieldSet
          aria-labelledby={legendId}
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          className="gap-3"
        >
          <FieldGroup className="gap-0">
            <RadioGroup
              value={selectedConnectionId ?? ""}
              onValueChange={(value) => {
                if (!value) return;
                form.setValue("triggerConfig.stripeConnectionId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                form.clearErrors("triggerConfig.stripeConnectionId");
              }}
              className={cn(
                "overflow-hidden rounded-lg gap-0 border ring-offset-[1.5px] dark:ring-offset-neutral-800",
                error
                  ? "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
                  : "border-border",
              )}
            >
              {stripeConnections.map((connection, index) => {
                const inputId = `${fieldIds}-stripe-plan-${connection.id}`;
                const isSelected = selectedConnectionId === connection.id;

                return (
                  <FieldLabel
                    key={connection.id}
                    htmlFor={inputId}
                    className={cn(
                      "w-full cursor-pointer border-0 shadow-none",
                      "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border-0",
                      "hover:bg-muted/50",
                      isSelected && "bg-primary/5",
                      "has-data-checked:border-0 has-data-checked:bg-primary/5 dark:has-data-checked:bg-primary/5",
                      index > 0 && "border-border! border-t!",
                    )}
                  >
                    <Field
                      orientation="horizontal"
                      className="gap-3 px-3 py-2.5"
                    >
                      <RadioGroupItem
                        value={connection.id}
                        id={inputId}
                        aria-invalid={Boolean(error)}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-primary/10 px-1.5"
                          aria-hidden="true"
                        >
                          <Image
                            src={stripeLogo}
                            alt="Stripe"
                            className="max-h-5 w-auto object-contain"
                          />
                        </div>
                        <FieldContent>
                          <FieldTitle className="line-clamp-1 font-medium text-foreground! text-sm">
                            {formatStripeConnectionLabel(connection)}
                          </FieldTitle>
                          {connection.monitoredStripePriceId ? (
                            <FieldDescription className="truncate text-muted-foreground text-xs">
                              {connection.monitoredStripePriceId}
                            </FieldDescription>
                          ) : null}
                        </FieldContent>
                      </div>
                    </Field>
                  </FieldLabel>
                );
              })}
            </RadioGroup>
          </FieldGroup>
        </FieldSet>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

type GroupSelectFieldProps = {
  form: UseFormReturn<AlertUpsertInput>;
  groups: TelegramGroupSummaryDto[];
  destinationType: AlertDestinationType;
  selectedGroupIds: string[];
  error?: string;
  fieldIds: string;
};

function GroupSelectField({
  form,
  groups,
  destinationType,
  selectedGroupIds,
  error,
  fieldIds,
}: GroupSelectFieldProps) {
  const selectableGroups = groups.filter((group) => {
    if (destinationType === "TOPIC") return group.isForum;
    if (destinationType === "AUTOMATION") return true;
    return !group.isForum;
  });
  const canSelectMultiple =
    destinationType === "GROUP" || destinationType === "AUTOMATION";

  return (
    <Field data-invalid={error ? true : undefined}>
      <AlertFieldLabel required>
        {canSelectMultiple ? "Grupos" : "Grupo"}
      </AlertFieldLabel>
      <ul
        aria-invalid={Boolean(error)}
        aria-label="Seleção de grupo"
        className={cn(
          "grid max-h-64 list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
          selectableGroups.length === 2 && "lg:grid-cols-2",
        )}
      >
        {selectableGroups.map((group) => {
          const isSelected = selectedGroupIds.includes(group.id);

          return (
            <button
              type="button"
              key={group.id}
              onClick={() => {
                if (canSelectMultiple) {
                  const nextIds = isSelected
                    ? selectedGroupIds.filter((id) => id !== group.id)
                    : [...new Set([...selectedGroupIds, group.id])];
                  form.setValue(
                    "triggerConfig.targetTelegramGroupIds",
                    nextIds,
                    {
                      shouldDirty: true,
                      shouldValidate: false,
                    },
                  );
                  form.setValue("telegramGroupId", nextIds[0], {
                    shouldDirty: true,
                    shouldValidate: false,
                  });
                } else {
                  form.setValue(
                    "triggerConfig.targetTelegramGroupIds",
                    [group.id],
                    {
                      shouldDirty: true,
                      shouldValidate: false,
                    },
                  );
                  form.setValue("telegramGroupId", group.id, {
                    shouldDirty: true,
                    shouldValidate: false,
                  });
                }
                form.clearErrors("triggerConfig.targetTelegramGroupIds");
                form.clearErrors("telegramGroupId");
                if (destinationType === "TOPIC") {
                  form.clearErrors("triggerConfig.targetMessageThreadIds");
                }
              }}
              className={cn(
                "group flex w-full h-full cursor-pointer relative gap-3 rounded-2xl border border-border p-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5",
                error &&
                  "border-destructive ring-2 ring-destructive/20 ring-offset-[1.5px] dark:border-destructive/50 dark:ring-destructive/40 dark:ring-offset-neutral-800",
                isSelected && "border-primary/60 bg-primary/10",
              )}
            >
              <ImageComponent
                src={
                  group.chatPhotoUrl
                    ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
                    : null
                }
                alt={group.title?.trim() || "Sem título"}
                width={40}
                height={40}
                sizes="40px"
                avatarFallbackClassName="text-sm"
                className="size-10 shrink-0 rounded-full border border-border object-cover"
              />
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <span className="truncate font-semibold text-sm text-foreground!">
                  {group.title ?? group.telegramChatId}
                </span>
                <p className="text-muted-foreground text-xs">
                  {formatGroupMemberCount(group)}
                </p>
              </div>
            </button>
          );
        })}
      </ul>
      <input
        type="hidden"
        id={`${fieldIds}-group`}
        value={selectedGroupIds.join(",")}
      />
      {selectableGroups.length === 0 ? (
        <FieldDescription>
          {destinationType === "TOPIC"
            ? "Nenhum grupo com tópicos habilitados encontrado."
            : "Nenhum grupo disponível para este destino."}
        </FieldDescription>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

type DetailsStepProps = {
  form: UseFormReturn<AlertUpsertInput>;
  groups: TelegramGroupSummaryDto[];
  stripeConnections: StripeBillingConnectionDto[];
  readOnlyDestination?: boolean;
};

function DestinationReadOnlyBanner({
  destinationType,
}: {
  destinationType: AlertDestinationType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <p className="font-medium text-sm">Destino do alerta</p>
      <p className="text-muted-foreground text-sm">
        {destinationLabels[destinationType]}. O tipo de destino e o público não
        podem ser alterados na edição.
      </p>
    </div>
  );
}

function DetailsStep({
  form,
  groups,
  stripeConnections,
  readOnlyDestination = false,
}: DetailsStepProps) {
  const fieldIds = useId();
  const { errors } = useFormState({ control: form.control });
  const destinationType = useWatch({
    control: form.control,
    name: "destinationType",
  });
  const selectedDestinationGroupIds = (useWatch({
    control: form.control,
    name: "triggerConfig.targetTelegramGroupIds",
  }) ?? []) as string[];
  const selectedGroupId = selectedDestinationGroupIds[0];
  const targetTelegramUserIds =
    useWatch({ control: form.control, name: "targetTelegramUserIds" }) ?? [];
  const inlineButtons =
    useWatch({ control: form.control, name: "content.inlineButtons" }) ?? [];
  const silent = Boolean(
    useWatch({ control: form.control, name: "options.silent" }),
  );
  const pinMessage = Boolean(
    useWatch({ control: form.control, name: "options.pinMessage" }),
  );
  const mentionUsers = Boolean(
    useWatch({ control: form.control, name: "options.mentionUsers" }),
  );

  const shouldShowGroupSelect =
    destinationType !== "MEMBERS" && destinationType !== "QUICK_ALERT";
  const isAutomation = destinationType === "AUTOMATION";

  function upsertInlineButton(
    index: number,
    key: "text" | "url",
    value: string,
  ) {
    const next = [...inlineButtons];
    const current = next[index] ?? { text: "", url: "" };
    next[index] = { ...current, [key]: value };
    form.setValue("content.inlineButtons", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function addInlineButton() {
    if (inlineButtons.length >= 8) return;
    form.setValue(
      "content.inlineButtons",
      [...inlineButtons, { text: "", url: "" }],
      { shouldDirty: true, shouldValidate: false },
    );
  }

  function removeInlineButton(index: number) {
    const next = inlineButtons.filter(
      (_, currentIndex) => currentIndex !== index,
    );
    form.setValue("content.inlineButtons", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const nameField = form.register("name");
  const titleField = form.register("content.title");
  const bodyField = form.register("content.body");
  const imageUrlField = form.register("content.imageUrl");

  const nameError = errors.name?.message;
  const bodyError = errors.content?.body?.message;
  const imageUrlError = errors.content?.imageUrl?.message;
  const groupError =
    errors.triggerConfig?.targetTelegramGroupIds?.message ??
    errors.telegramGroupId?.message;
  const topicError = errors.triggerConfig?.targetMessageThreadIds?.message;
  const membersError = errors.targetTelegramUserIds?.message;
  const triggerTypeError = errors.triggerType?.message;
  const stripeConnectionError =
    errors.triggerConfig?.stripeConnectionId?.message;
  const triggerType = useWatch({ control: form.control, name: "triggerType" });
  const selectedStripeConnectionId = useWatch({
    control: form.control,
    name: "triggerConfig.stripeConnectionId",
  });
  const isStripeTrigger = isStripeAutomationTriggerType(triggerType);
  const supportsMemberNamePlaceholder =
    triggerType != null &&
    memberAutomationTriggerTypes.includes(
      triggerType as (typeof memberAutomationTriggerTypes)[number],
    );

  useEffect(() => {
    if (!isStripeTrigger) {
      if (selectedStripeConnectionId) {
        form.setValue("triggerConfig.stripeConnectionId", undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      return;
    }

    if (
      selectedStripeConnectionId &&
      stripeConnections.some(
        (connection) => connection.id === selectedStripeConnectionId,
      )
    ) {
      return;
    }

    if (stripeConnections.length === 1) {
      form.setValue(
        "triggerConfig.stripeConnectionId",
        stripeConnections[0].id,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    }
  }, [form, isStripeTrigger, selectedStripeConnectionId, stripeConnections]);

  return (
    <div>
      <FieldGroup className="gap-6">
        {readOnlyDestination ? (
          <DestinationReadOnlyBanner destinationType={destinationType} />
        ) : null}

        {!readOnlyDestination && destinationType !== "QUICK_ALERT" && (
          <FieldSet className="rounded-2xl border border-border p-4">
            <FieldLegend id={`${fieldIds}-destination-config-legend`}>
              Destino e público
            </FieldLegend>
            <FieldDescription id={`${fieldIds}-destination-config-desc`}>
              {isAutomation
                ? "Selecione os grupos monitorados, o evento e o plano Stripe integrado quando o alerta for da Stripe."
                : "Ajuste o grupo, tópico ou membros conforme o tipo de envio."}
            </FieldDescription>
            <FieldGroup
              className="gap-4"
              aria-labelledby={`${fieldIds}-destination-config-legend`}
              aria-describedby={`${fieldIds}-destination-config-desc`}
            >
              {shouldShowGroupSelect ? (
                <GroupSelectField
                  form={form}
                  groups={groups}
                  destinationType={destinationType}
                  selectedGroupIds={selectedDestinationGroupIds}
                  error={groupError}
                  fieldIds={fieldIds}
                />
              ) : null}

              {isAutomation && selectedDestinationGroupIds.length > 0 ? (
                <AutomationEventSelectField
                  form={form}
                  groups={groups}
                  selectedGroupIds={selectedDestinationGroupIds}
                  fieldIds={fieldIds}
                  error={triggerTypeError}
                />
              ) : null}

              {isAutomation && isStripeTrigger ? (
                <StripePlanSelectField
                  form={form}
                  stripeConnections={stripeConnections}
                  fieldIds={fieldIds}
                  error={stripeConnectionError}
                />
              ) : null}

              {destinationType === "TOPIC" ? (
                <ForumTopicSelectField
                  form={form}
                  groupId={selectedGroupId}
                  fieldIdPrefix={fieldIds}
                  error={topicError}
                />
              ) : null}

              {destinationType === "MEMBERS" ? (
                <MemberAcrossGroupsCheckboxList
                  form={form}
                  groups={groups}
                  selectedUserIds={targetTelegramUserIds}
                  legendId={`${fieldIds}-members-legend`}
                  emptyMessageId={`${fieldIds}-members-empty`}
                  fieldIdPrefix={`${fieldIds}-members`}
                  legend="Membros"
                  description="Selecione os membros cadastrados nos seus grupos que receberão esta mensagem."
                  required
                  error={membersError}
                />
              ) : null}
            </FieldGroup>
          </FieldSet>
        )}

        <FieldSet className="rounded-2xl border border-border p-4">
          <FieldLegend id={`${fieldIds}-alert-config-legend`}>
            Conteúdo e configuração do alerta
          </FieldLegend>
          <FieldDescription id={`${fieldIds}-alert-config-desc`}>
            Campos comuns a todos os tipos de destino: identificação, mensagem,
            botões e opções de envio no Telegram.
          </FieldDescription>
          <FieldGroup
            className="gap-4"
            aria-labelledby={`${fieldIds}-alert-config-legend`}
            aria-describedby={`${fieldIds}-alert-config-desc`}
          >
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={nameError ? true : undefined}>
                <AlertFieldLabel htmlFor={`${fieldIds}-name`} required>
                  Nome interno
                </AlertFieldLabel>
                <Input
                  id={`${fieldIds}-name`}
                  placeholder="Ex.: Regras semanais"
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={Boolean(nameError)}
                  {...nameField}
                  onChange={(event) => {
                    nameField.onChange(event);
                    if (errors.name) form.clearErrors("name");
                  }}
                />
                {nameError ? <FieldError>{nameError}</FieldError> : null}
              </Field>
              <Field>
                <AlertFieldLabel htmlFor={`${fieldIds}-content-title`}>
                  Título da mensagem
                </AlertFieldLabel>
                <Input
                  id={`${fieldIds}-content-title`}
                  placeholder="Ex.: Aviso importante"
                  autoComplete="off"
                  {...titleField}
                />
              </Field>
            </FieldGroup>

            <Field data-invalid={bodyError ? true : undefined}>
              <AlertFieldLabel htmlFor={`${fieldIds}-content-body`} required>
                Descrição / Mensagem
              </AlertFieldLabel>
              <Textarea
                id={`${fieldIds}-content-body`}
                rows={6}
                placeholder="Escreva a mensagem que será enviada no Telegram..."
                aria-required="true"
                aria-invalid={Boolean(bodyError)}
                aria-describedby={`${fieldIds}-content-body-hint`}
                {...bodyField}
                onChange={(event) => {
                  bodyField.onChange(event);
                  if (errors.content?.body) form.clearErrors("content.body");
                }}
              />
              <FieldError>{bodyError}</FieldError>
              {supportsMemberNamePlaceholder ? (
                <FieldDescription id={`${fieldIds}-content-body-hint`}>
                  Use <code>{"{name}"}</code> para inserir o nome de quem
                  disparou o evento.
                </FieldDescription>
              ) : null}
            </Field>

            <Field data-invalid={imageUrlError ? true : undefined}>
              <AlertFieldLabel htmlFor={`${fieldIds}-image-url`}>
                URL da imagem
              </AlertFieldLabel>
              <Input
                id={`${fieldIds}-image-url`}
                type="url"
                inputMode="url"
                placeholder="https://..."
                autoComplete="url"
                aria-invalid={Boolean(imageUrlError)}
                aria-describedby={`${fieldIds}-image-url-hint`}
                {...imageUrlField}
                onChange={(event) => {
                  imageUrlField.onChange(event);
                  if (errors.content?.imageUrl) {
                    form.clearErrors("content.imageUrl");
                  }
                }}
              />
              <FieldError>{imageUrlError}</FieldError>
            </Field>

            <FieldSet className="rounded-xl relative border border-border p-4">
              <FieldLegend id={`${fieldIds}-inline-buttons-legend`}>
                Botões da mensagem
              </FieldLegend>
              <FieldDescription id={`${fieldIds}-inline-buttons-hint`}>
                Adicione até 8 botões com texto e URL. Você está usando{" "}
                {inlineButtons.length} de 8.
              </FieldDescription>
              <Button
                type="button"
                variant="outline"
                className="absolute top-0 right-4"
                size="sm"
                onClick={addInlineButton}
                disabled={inlineButtons.length >= 8}
                aria-describedby={`${fieldIds}-inline-buttons-hint`}
              >
                Adicionar botão
              </Button>

              {inlineButtons && inlineButtons.length > 0 && (
                <ul
                  aria-labelledby={`${fieldIds}-inline-buttons-legend`}
                  className="list-none space-y-2"
                >
                  {inlineButtons.map((button, index) => {
                    const rowLegendId = `${fieldIds}-inline-button-${index}`;
                    return (
                      <li key={rowLegendId}>
                        <FieldSet className="rounded-xl border border-border p-3">
                          <FieldLegend className="sr-only">
                            Botão {index + 1} de {inlineButtons.length}
                          </FieldLegend>
                          <FieldGroup className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                            <Field>
                              <FieldLabel htmlFor={`${rowLegendId}-text`}>
                                Texto
                              </FieldLabel>
                              <Input
                                id={`${rowLegendId}-text`}
                                placeholder="Texto do botão"
                                value={button.text}
                                maxLength={64}
                                aria-required="true"
                                aria-invalid={Boolean(
                                  errors.content?.inlineButtons?.[index]?.text
                                    ?.message,
                                )}
                                onChange={(event) =>
                                  upsertInlineButton(
                                    index,
                                    "text",
                                    event.target.value,
                                  )
                                }
                              />
                              <FieldError>
                                {
                                  errors.content?.inlineButtons?.[index]?.text
                                    ?.message
                                }
                              </FieldError>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${rowLegendId}-url`}>
                                URL
                              </FieldLabel>
                              <Input
                                id={`${rowLegendId}-url`}
                                type="url"
                                inputMode="url"
                                placeholder="https://link-do-botao.com"
                                value={button.url}
                                aria-required="true"
                                aria-invalid={Boolean(
                                  errors.content?.inlineButtons?.[index]?.url
                                    ?.message,
                                )}
                                onChange={(event) =>
                                  upsertInlineButton(
                                    index,
                                    "url",
                                    event.target.value,
                                  )
                                }
                              />
                              <FieldError>
                                {
                                  errors.content?.inlineButtons?.[index]?.url
                                    ?.message
                                }
                              </FieldError>
                            </Field>
                            <div className="flex items-start pt-[27px]">
                              <Button
                                type="button"
                                variant="destructive"
                                aria-label={`Remover botão ${index + 1}`}
                                onClick={() => removeInlineButton(index)}
                              >
                                Remover
                              </Button>
                            </div>
                          </FieldGroup>
                        </FieldSet>
                      </li>
                    );
                  })}
                </ul>
              )}
            </FieldSet>

            <FieldSet className="rounded-xl border border-border p-4">
              <FieldLegend id={`${fieldIds}-telegram-options-legend`}>
                Opções de envio no Telegram
              </FieldLegend>
              <FieldGroup className="grid gap-3 sm:grid-cols-2">
                <Field orientation="horizontal">
                  <Checkbox
                    id={`${fieldIds}-silent`}
                    checked={silent}
                    onCheckedChange={(checked) =>
                      form.setValue("options.silent", checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <FieldLabel
                    htmlFor={`${fieldIds}-silent`}
                    className="font-normal"
                  >
                    Envio silencioso
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id={`${fieldIds}-pin`}
                    checked={pinMessage}
                    onCheckedChange={(checked) =>
                      form.setValue("options.pinMessage", checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <FieldLabel
                    htmlFor={`${fieldIds}-pin`}
                    className="font-normal"
                  >
                    Fixar mensagem no chat
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id={`${fieldIds}-mention`}
                    checked={mentionUsers}
                    onCheckedChange={(checked) =>
                      form.setValue("options.mentionUsers", checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <FieldLabel
                    htmlFor={`${fieldIds}-mention`}
                    className="font-normal"
                  >
                    Mencionar usuários (quando aplicável)
                  </FieldLabel>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </FieldSet>
      </FieldGroup>
    </div>
  );
}

type DestinationStepProps = {
  form: UseFormReturn<AlertUpsertInput>;
};

function DestinationStep({ form }: DestinationStepProps) {
  const destinationType = useWatch({
    control: form.control,
    name: "destinationType",
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {destinationOptions.map(
        ({ value, title, description, alert, icon: Icon }) => {
          const isSelected = destinationType === value;

          return (
            <SelectableOptionCard
              key={value}
              title={title}
              description={description}
              isSelected={isSelected}
              AnimatedIcon={Icon}
              headerAction={
                alert ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={(triggerProps) => (
                        <span
                          {...triggerProps}
                          className={cn(
                            "inline-flex shrink-0",
                            triggerProps.className,
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            triggerProps.onClick?.(event);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          role="presentation"
                          aria-hidden="true"
                        >
                          <BadgeAlertIcon size={16} />
                        </span>
                      )}
                    />
                    <TooltipContent
                      side="top"
                      sideOffset={8}
                      className="max-w-xs text-pretty"
                    >
                      {alert}
                    </TooltipContent>
                  </Tooltip>
                ) : null
              }
              onSelect={() => {
                form.setValue("destinationType", value, {
                  shouldDirty: true,
                  shouldValidate: false,
                });
                resetAudienceFields(form);
              }}
            />
          );
        },
      )}
    </div>
  );
}

type WizardNextButtonProps = {
  stepIndex: number;
  detailsStepIndex: number;
  form: UseFormReturn<AlertUpsertInput>;
  iconIndex: number;
  arrowRightIconRefs: MutableRefObject<(ArrowRightIconHandle | null)[]>;
};

function WizardNextButton({
  stepIndex,
  detailsStepIndex,
  form,
  iconIndex,
  arrowRightIconRefs,
}: WizardNextButtonProps) {
  const { goNext } = useDialogStackNavigation();

  return (
    <Button
      type="button"
      className="ml-auto w-40"
      onClick={() => {
        if (stepIndex === detailsStepIndex && !validateAlertDetailsStep(form)) {
          return;
        }
        goNext();
      }}
      onMouseEnter={() =>
        arrowRightIconRefs.current[iconIndex]?.startAnimation()
      }
      onMouseLeave={() =>
        arrowRightIconRefs.current[iconIndex]?.stopAnimation()
      }
    >
      Próximo
      <ArrowRightIcon
        ref={(el) => {
          arrowRightIconRefs.current[iconIndex] = el;
        }}
        size={16}
      />
    </Button>
  );
}

type ReviewStepProps = {
  form: UseFormReturn<AlertUpsertInput>;
  groups: TelegramGroupSummaryDto[];
  stripeConnections: StripeBillingConnectionDto[];
};

function ReviewStep({ form, groups, stripeConnections }: ReviewStepProps) {
  const [topicNamesById, setTopicNamesById] = useState<Record<number, string>>(
    {},
  );
  const destinationType = useWatch({
    control: form.control,
    name: "destinationType",
  });
  const triggerType = useWatch({ control: form.control, name: "triggerType" });
  const selectedGroupIds = (useWatch({
    control: form.control,
    name: "triggerConfig.targetTelegramGroupIds",
  }) ?? []) as string[];
  const alertName = useWatch({ control: form.control, name: "name" });
  const contentTitle = useWatch({
    control: form.control,
    name: "content.title",
  });
  const contentBody = useWatch({ control: form.control, name: "content.body" });
  const contentImageUrl = useWatch({
    control: form.control,
    name: "content.imageUrl",
  });
  const messageThreadIds = (useWatch({
    control: form.control,
    name: "triggerConfig.targetMessageThreadIds",
  }) ?? []) as number[];
  const selectedStripeConnectionId = useWatch({
    control: form.control,
    name: "triggerConfig.stripeConnectionId",
  });
  const selectedGroupId = selectedGroupIds[0];

  useEffect(() => {
    if (
      destinationType !== "TOPIC" ||
      !selectedGroupId ||
      messageThreadIds.length === 0
    ) {
      setTopicNamesById({});
      return;
    }

    const controller = new AbortController();

    void fetch(
      `/api/alerts/groups/${encodeURIComponent(selectedGroupId)}/forum-topics`,
      { cache: "no-store", signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;

        const next: Record<number, string> = {};
        for (const item of data) {
          if (!item || typeof item !== "object") continue;
          const raw = item as { messageThreadId?: unknown; name?: unknown };
          if (
            typeof raw.messageThreadId === "number" &&
            typeof raw.name === "string"
          ) {
            next[raw.messageThreadId] = raw.name;
          }
        }
        setTopicNamesById(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTopicNamesById({});
        }
      });

    return () => {
      controller.abort();
    };
  }, [destinationType, messageThreadIds.length, selectedGroupId]);

  const targetMembers =
    useWatch({ control: form.control, name: "targetTelegramUserIds" }) ?? [];
  const inlineButtons =
    useWatch({ control: form.control, name: "content.inlineButtons" }) ?? [];
  const silent = useWatch({ control: form.control, name: "options.silent" });
  const pinMessage = useWatch({
    control: form.control,
    name: "options.pinMessage",
  });
  const mentionUsers = useWatch({
    control: form.control,
    name: "options.mentionUsers",
  });

  const selectedGroupNames = selectedGroupIds
    .map((groupId) => {
      const group = groups.find((item) => item.id === groupId);
      return group?.title ?? group?.telegramChatId;
    })
    .filter((name): name is string => Boolean(name?.trim()));

  const groupsSummary =
    selectedGroupNames.length > 0 ? selectedGroupNames.join(", ") : undefined;

  const automationEventLabel =
    triggerType && triggerType in alertTriggerLabels
      ? alertTriggerLabels[triggerType as keyof typeof alertTriggerLabels]
      : undefined;

  const selectedStripeConnection = stripeConnections.find(
    (connection) => connection.id === selectedStripeConnectionId,
  );
  const stripePlanLabel = selectedStripeConnection
    ? formatStripeConnectionLabel(selectedStripeConnection)
    : undefined;

  const sendTypeLabel =
    destinationType === "AUTOMATION"
      ? automationEventLabel
        ? `Ao evento: ${automationEventLabel}`
        : "Ao evento do grupo"
      : destinationType === "QUICK_ALERT"
        ? "Modelo — envio nas tabelas de membros ou grupos"
        : destinationType
          ? "Imediato ao publicar ou rascunho"
          : undefined;

  const inlineButtonsSummary =
    inlineButtons.length > 0
      ? inlineButtons
          .map((button, index) => {
            const text = button.text?.trim();
            if (!text) return null;
            return `${index + 1}. ${text}`;
          })
          .filter(Boolean)
          .join(" · ") || undefined
      : undefined;

  const topicsSummary = formatTopicReviewSummary(
    messageThreadIds,
    topicNamesById,
  );

  const audienceFields = buildDestinationAudienceFields({
    destinationType,
    groupsSummary,
    topicsSummary,
    targetMembersCount: targetMembers.length,
    automationEventLabel,
    stripePlanLabel,
  });

  const reviewFields: {
    label: string;
    value: string;
    lineClamp?: 2 | 3;
  }[] = [
    {
      label: "Nome interno",
      value: formatReviewValue(alertName),
      lineClamp: 2,
    },
    { label: "Título da mensagem", value: formatReviewValue(contentTitle) },
    {
      label: "Mensagem",
      value: formatReviewValue(contentBody),
      lineClamp: 3,
    },
    {
      label: "URL da imagem",
      value: formatReviewValue(contentImageUrl),
      lineClamp: 2,
    },
    {
      label: "Destino",
      value: formatReviewValue(
        destinationType ? destinationLabels[destinationType] : undefined,
      ),
    },
    ...audienceFields,
    { label: "Tipo de envio", value: formatReviewValue(sendTypeLabel) },
    {
      label: "Botões inline",
      value: formatReviewValue(inlineButtonsSummary),
      lineClamp: 2,
    },
    {
      label: "Envio silencioso",
      value: formatReviewBoolean(silent),
    },
    { label: "Fixar mensagem", value: formatReviewBoolean(pinMessage) },
    {
      label: "Mencionar usuários",
      value: formatReviewBoolean(mentionUsers),
    },
  ];

  return (
    <AlertReviewSummary
      title={formatReviewValue(alertName)}
      fields={reviewFields}
    />
  );
}

export function CreateAlertDialog({
  groups,
  stripeConnections,
  onCreated,
  buttonText = "Criar Alerta",
  open: openProp,
  onOpenChange: onOpenChangeProp,
  showTrigger = true,
  alertToEdit = null,
}: CreateAlertDialogProps) {
  const isEditMode = Boolean(alertToEdit);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const plusIconRef = useRef<PlusIconHandle | null>(null);
  const xIconRefs = useRef<(XIconHandle | null)[]>([]);
  const arrowLeftIconRefs = useRef<(ArrowLeftIconHandle | null)[]>([]);
  const arrowRightIconRefs = useRef<(ArrowRightIconHandle | null)[]>([]);

  const form = useForm<AlertUpsertInput>({
    resolver: zodResolver(alertUpsertSchema) as Resolver<AlertUpsertInput>,
    defaultValues: DEFAULT_ALERT_FORM_VALUES,
  });

  const destinationType = form.watch("destinationType");
  const selectedDestinationGroupIds =
    form.watch("triggerConfig.targetTelegramGroupIds") ?? [];

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isControlled) {
        onOpenChangeProp?.(next);
      } else {
        setInternalOpen(next);
      }
      if (!next) {
        form.reset(DEFAULT_ALERT_FORM_VALUES);
      }
    },
    [form, isControlled, onOpenChangeProp],
  );

  useEffect(() => {
    if (!open) return;

    if (alertToEdit) {
      form.reset(mapAlertSummaryToFormValues(alertToEdit));
      return;
    }

    form.reset(DEFAULT_ALERT_FORM_VALUES);
  }, [alertToEdit, form, open]);

  useEffect(() => {
    const currentTelegramGroupId = form.getValues("telegramGroupId");
    if (!selectedDestinationGroupIds.length) {
      if (currentTelegramGroupId) {
        form.setValue("telegramGroupId", undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      return;
    }

    if (destinationType === "TOPIC" && selectedDestinationGroupIds.length > 1) {
      const firstGroupId = selectedDestinationGroupIds[0];
      form.setValue("triggerConfig.targetTelegramGroupIds", [firstGroupId], {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.setValue("telegramGroupId", firstGroupId, {
        shouldDirty: true,
        shouldValidate: false,
      });
      return;
    }

    const nextPrimaryGroupId = selectedDestinationGroupIds[0];
    if (currentTelegramGroupId !== nextPrimaryGroupId) {
      form.setValue("telegramGroupId", nextPrimaryGroupId, {
        shouldDirty: true,
        shouldValidate: false,
      });

      if (destinationType === "TOPIC") {
        form.setValue("triggerConfig.targetMessageThreadIds", [], {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.setValue("messageThreadId", undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.clearErrors("triggerConfig.targetMessageThreadIds");
      }
    }
  }, [destinationType, form, selectedDestinationGroupIds]);

  const submit = useCallback(
    async (
      status: AlertSummaryDto["status"] | "DRAFT" | "ACTIVE",
    ): Promise<boolean> => {
      setIsSubmitting(true);
      const rawValues = form.getValues();
      let values = normalizeAlertFormValues(rawValues);
      if (alertToEdit) {
        values = lockDestinationFields(
          values,
          mapAlertSummaryToFormValues(alertToEdit),
        );
      }
      const normalizedGroupIds = (
        values.triggerConfig?.targetTelegramGroupIds ?? []
      ).filter(Boolean);
      const normalizedPrimaryGroupId =
        normalizedGroupIds[0] ?? values.telegramGroupId;
      const normalizedTopicIds = (
        values.triggerConfig?.targetMessageThreadIds ?? []
      ).filter((threadId) => Number.isFinite(threadId) && threadId > 0);
      const normalizedValues: AlertUpsertInput = {
        ...values,
        telegramGroupId:
          values.destinationType === "MEMBERS" ||
          values.destinationType === "QUICK_ALERT"
            ? undefined
            : normalizedPrimaryGroupId,
        messageThreadId: normalizedTopicIds[0],
        triggerConfig: {
          ...(values.triggerConfig ?? {}),
          targetTelegramGroupIds: normalizedGroupIds,
          targetMessageThreadIds: normalizedTopicIds,
        },
      };
      const payload: AlertUpsertInput = {
        ...normalizedValues,
        status,
        ...(normalizedValues.destinationType === "AUTOMATION"
          ? { triggerType: normalizedValues.triggerType }
          : { triggerType: undefined }),
      };
      const result = alertUpsertSchema.safeParse(payload);

      if (!result.success) {
        applyZodIssuesToForm(form, result.error);
        setIsSubmitting(false);
        return false;
      }

      const requestUrl = alertToEdit
        ? `/api/alerts/${encodeURIComponent(alertToEdit.id)}`
        : "/api/alerts";
      const requestMethod = alertToEdit ? "PATCH" : "POST";

      try {
        const response = await fetch(requestUrl, {
          method: requestMethod,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(result.data),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.error ??
              (alertToEdit
                ? "Não foi possível atualizar o alerta."
                : "Não foi possível criar o alerta."),
          );
        }
        const successToast = alertToEdit
          ? getUpdateAlertSuccessToast(status, result.data.destinationType)
          : getCreateAlertSuccessToast(
              status === "DRAFT" ? "DRAFT" : "ACTIVE",
              result.data.destinationType,
            );
        toast.success(successToast.title, {
          description: successToast.description,
        });
        onCreated();
        handleOpenChange(false);
        return true;
      } catch (error) {
        const description =
          error instanceof Error
            ? error.message
            : alertToEdit
              ? "Não foi possível atualizar o alerta. Tente novamente."
              : "Não foi possível criar o alerta. Tente novamente.";
        toast.error(
          alertToEdit ? "Falha ao atualizar alerta" : "Falha ao criar alerta",
          { description },
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [alertToEdit, form, handleOpenChange, onCreated],
  );

  const detailsStepIndex = isEditMode ? 0 : 1;
  const progressSteps = isEditMode
    ? [
        { id: "details", label: "Detalhes" },
        { id: "review", label: "Revisão" },
      ]
    : [...dialogProgressSteps];

  const steps: CreateAlertWizardStep[] = isEditMode
    ? [
        {
          title: "Editar alerta",
          description:
            "Atualize o conteúdo, botões e opções de envio. O destino permanece o mesmo.",
          content: (
            <DetailsStep
              form={form}
              groups={groups}
              stripeConnections={stripeConnections}
              readOnlyDestination
            />
          ),
          showPreviousButton: false,
        },
        {
          title: "Revisar dados",
          description:
            "Confira as alterações antes de salvar o alerta atualizado.",
          content: (
            <ReviewStep
              form={form}
              groups={groups}
              stripeConnections={stripeConnections}
            />
          ),
        },
      ]
    : [
        {
          title: "Onde enviar",
          description:
            "Escolha o destino do alerta e veja claramente público e objetivo de cada opção antes de avançar.",
          content: <DestinationStep form={form} />,
          showPreviousButton: false,
        },
        {
          title: "Detalhes do alerta",
          description:
            "Configure público, grupo/tópico quando necessário, conteúdo da mensagem, botões e opções avançadas do Telegram.",
          content: (
            <DetailsStep
              form={form}
              groups={groups}
              stripeConnections={stripeConnections}
            />
          ),
        },
        {
          title: "Revisar dados",
          description:
            "Revise tudo que foi definido no destino e nos detalhes antes de salvar rascunho ou publicar.",
          content: (
            <ReviewStep
              form={form}
              groups={groups}
              stripeConnections={stripeConnections}
            />
          ),
        },
      ];

  return (
    <DialogStack
      open={open}
      onOpenChange={handleOpenChange}
      className={showTrigger ? undefined : "contents"}
    >
      {showTrigger ? (
        <DialogStackTrigger asChild>
          <Button
            type="button"
            variant="default"
            onClick={() => handleOpenChange(true)}
            onMouseEnter={() => plusIconRef.current?.startAnimation()}
            onMouseLeave={() => plusIconRef.current?.stopAnimation()}
          >
            <PlusIcon ref={plusIconRef} size={14} />
            {buttonText}
          </Button>
        </DialogStackTrigger>
      ) : null}

      <DialogStackOverlay />

      <DialogStackBody className="max-w-3xl">
        {steps.map((step, index) => {
          const hasNext = step.showNextButton ?? index < steps.length - 1;
          const hasPrevious = step.showPreviousButton ?? index > 0;
          const showFooter =
            hasNext || hasPrevious || index === steps.length - 1;

          return (
            <DialogStackContent
              key={step.title}
              className="flex h-[640px] flex-col overflow-hidden"
            >
              <DialogStackHeader className="shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-y-1 pr-2">
                    <DialogStackTitle>{step.title}</DialogStackTitle>
                    <DialogStackDescription>
                      {step.description}
                    </DialogStackDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleOpenChange(false)}
                    onMouseEnter={() =>
                      xIconRefs.current[index]?.startAnimation()
                    }
                    onMouseLeave={() =>
                      xIconRefs.current[index]?.stopAnimation()
                    }
                  >
                    <XIcon
                      ref={(el) => {
                        xIconRefs.current[index] = el;
                      }}
                      size={16}
                    />
                  </Button>
                </div>
                <DialogStackProgress steps={progressSteps} />
              </DialogStackHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
                {step.content}
              </div>

              {showFooter ? (
                <DialogStackFooter className="mt-auto flex w-full shrink-0 justify-between border-t border-border">
                  {hasPrevious ? (
                    <DialogStackPrevious asChild>
                      <Button
                        type="button"
                        className="w-40"
                        variant="outline"
                        onMouseEnter={() =>
                          arrowLeftIconRefs.current[index]?.startAnimation()
                        }
                        onMouseLeave={() =>
                          arrowLeftIconRefs.current[index]?.stopAnimation()
                        }
                      >
                        <ArrowLeftIcon
                          ref={(el) => {
                            arrowLeftIconRefs.current[index] = el;
                          }}
                          size={16}
                        />
                        Anterior
                      </Button>
                    </DialogStackPrevious>
                  ) : (
                    <span />
                  )}

                  {hasNext ? (
                    <WizardNextButton
                      stepIndex={index}
                      detailsStepIndex={detailsStepIndex}
                      form={form}
                      iconIndex={index}
                      arrowRightIconRefs={arrowRightIconRefs}
                    />
                  ) : (
                    <div className="ml-auto flex gap-2">
                      {destinationType !== "QUICK_ALERT" &&
                        destinationType !== "AUTOMATION" && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-40"
                            loading={isSubmitting}
                            onClick={async () => {
                              if (!validateAlertDetailsStep(form)) return;
                              await submit("DRAFT");
                            }}
                          >
                            Salvar rascunho
                          </Button>
                        )}

                      <Button
                        type="button"
                        className="w-40"
                        loading={isSubmitting}
                        onClick={async () => {
                          if (!validateAlertDetailsStep(form)) return;
                          const primaryStatus =
                            isEditMode &&
                            alertToEdit &&
                            alertToEdit.status !== "DRAFT"
                              ? alertToEdit.status
                              : "ACTIVE";
                          await submit(primaryStatus);
                        }}
                      >
                        {isEditMode &&
                        alertToEdit &&
                        alertToEdit.status !== "DRAFT"
                          ? "Salvar alterações"
                          : destinationType === "AUTOMATION" ||
                              destinationType === "QUICK_ALERT"
                            ? "Publicar"
                            : "Publicar e enviar"}
                      </Button>
                    </div>
                  )}
                </DialogStackFooter>
              ) : null}
            </DialogStackContent>
          );
        })}
      </DialogStackBody>
    </DialogStack>
  );
}
