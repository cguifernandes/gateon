"use client";

import { useMemo } from "react";
import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { buildBotStartPreviewMessage } from "@/lib/bot-start-message-builder";
import {
  defaultBotStartSettingsValues,
  type TelegramBotStartSettingsDto,
} from "@/lib/zod/bot-start-settings-schemas";

type StripeConnectionPreview = {
  id: string;
  label: string;
  linkedGroup?: { id: string; title: string } | null;
};

type BotStartMessagePreviewProps = {
  control: Control<TelegramBotStartSettingsDto>;
  botUsername: string;
  availableStripeConnections: StripeConnectionPreview[];
};

export function BotStartMessagePreview({
  control,
  botUsername,
  availableStripeConnections,
}: BotStartMessagePreviewProps) {
  const watchedValues = useWatch({ control });

  const values = useMemo((): TelegramBotStartSettingsDto => {
    const defaults = defaultBotStartSettingsValues;

    return {
      welcomeMessageEnabled:
        watchedValues?.welcomeMessageEnabled ?? defaults.welcomeMessageEnabled,
      welcomeMessage: watchedValues?.welcomeMessage ?? defaults.welcomeMessage,
      showStripePlans:
        watchedValues?.showStripePlans ?? defaults.showStripePlans,
      stripeConnectionIds:
        watchedValues?.stripeConnectionIds ?? defaults.stripeConnectionIds,
      showPaymentButtons:
        watchedValues?.showPaymentButtons ?? defaults.showPaymentButtons,
      paymentButtonConnectionIds:
        watchedValues?.paymentButtonConnectionIds ??
        defaults.paymentButtonConnectionIds,
      paymentButtonsGroupFirst:
        watchedValues?.paymentButtonsGroupFirst ??
        defaults.paymentButtonsGroupFirst,
      showSupportHint:
        watchedValues?.showSupportHint ?? defaults.showSupportHint,
      supportHintText:
        watchedValues?.supportHintText ?? defaults.supportHintText,
      showSubscribeSteps:
        watchedValues?.showSubscribeSteps ?? defaults.showSubscribeSteps,
      autoRemoveExpiredSubscribers:
        watchedValues?.autoRemoveExpiredSubscribers ??
        defaults.autoRemoveExpiredSubscribers,
    };
  }, [watchedValues]);

  const stripePlans = useMemo(() => {
    if (!values.showStripePlans) {
      return [];
    }

    const selectedIds = new Set(values.stripeConnectionIds);
    const connections =
      selectedIds.size === 0
        ? availableStripeConnections
        : availableStripeConnections.filter((connection) =>
            selectedIds.has(connection.id),
          );

    return connections.map((connection) => ({ label: connection.label }));
  }, [
    availableStripeConnections,
    values.showStripePlans,
    values.stripeConnectionIds,
  ]);

  const paymentPlans = useMemo(() => {
    if (!values.showPaymentButtons) {
      return [];
    }

    const selectedIds = new Set(values.paymentButtonConnectionIds);
    const connections =
      selectedIds.size === 0
        ? availableStripeConnections
        : availableStripeConnections.filter((connection) =>
            selectedIds.has(connection.id),
          );

    return connections.map((connection) => ({ label: connection.label }));
  }, [
    availableStripeConnections,
    values.paymentButtonConnectionIds,
    values.showPaymentButtons,
  ]);

  const paymentGroups = useMemo(() => {
    if (!values.showPaymentButtons || !values.paymentButtonsGroupFirst) {
      return [];
    }

    const selectedIds = new Set(values.paymentButtonConnectionIds);
    const connections =
      selectedIds.size === 0
        ? availableStripeConnections
        : availableStripeConnections.filter((connection) =>
            selectedIds.has(connection.id),
          );

    const groups = new Map<string, string>();
    for (const connection of connections) {
      if (!connection.linkedGroup) continue;
      groups.set(connection.linkedGroup.id, connection.linkedGroup.title);
    }

    return Array.from(groups.values()).map((title) => ({ label: title }));
  }, [
    availableStripeConnections,
    values.paymentButtonConnectionIds,
    values.paymentButtonsGroupFirst,
    values.showPaymentButtons,
  ]);

  const message = useMemo(
    () =>
      buildBotStartPreviewMessage({
        welcomeMessageEnabled: values.welcomeMessageEnabled,
        welcomeMessage: values.welcomeMessage ?? "",
        showStripePlans: values.showStripePlans,
        showPaymentButtons: values.showPaymentButtons,
        paymentButtonsGroupFirst: values.paymentButtonsGroupFirst,
        stripePlans,
        paymentPlans,
        paymentGroups,
        showSupportHint: values.showSupportHint,
        supportHintText: values.supportHintText ?? "",
        showSubscribeSteps: values.showSubscribeSteps,
      }),
    [paymentGroups, paymentPlans, stripePlans, values],
  );

  const normalizedBotUsername = botUsername.replace(/^@/, "").trim() || "bot";

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="border-border border-b px-3 py-2.5">
        <p className="font-medium text-foreground text-sm">Pré-visualização</p>
        <p className="text-muted-foreground text-xs">
          Como o visitante verá no chat privado
        </p>
      </div>

      <div className="space-y-3 bg-linear-to-t from-card via-card to-primary/30 p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-medium text-primary text-xs">
            {normalizedBotUsername.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              {normalizedBotUsername}
            </p>
            <p className="text-muted-foreground text-xs">bot</p>
          </div>
        </div>

        <div className="max-w-[95%] rounded-2xl rounded-tl-md border border-border bg-background px-3 py-2.5 shadow-sm">
          <p className="whitespace-pre-wrap font-light text-foreground text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {values.paymentButtonsGroupFirst && paymentGroups.length > 0 ? (
          <div className="flex max-w-[95%] flex-col gap-2">
            {paymentGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center font-medium text-primary text-sm"
              >
                {group.label}
              </div>
            ))}
          </div>
        ) : paymentPlans.length > 0 ? (
          <div className="flex max-w-[95%] flex-col gap-2">
            {paymentPlans.map((plan) => (
              <div
                key={plan.label}
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center font-medium text-primary text-sm"
              >
                {plan.label}
              </div>
            ))}
          </div>
        ) : null}

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Atualiza em tempo real conforme você altera as opções acima.
        </p>
      </div>
    </div>
  );
}
