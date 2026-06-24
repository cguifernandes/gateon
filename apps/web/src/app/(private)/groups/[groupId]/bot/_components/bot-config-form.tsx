"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useController, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRefreshTelegramGroup } from "@/app/(private)/groups/_hooks/use-refresh-telegram-group";
import { RemoveGroupDialog } from "@/components/remove-group-dialog";
import {
  type TelegramBotStartSettingsResponseDto,
  telegramBotStartSettingsResponseSchema,
} from "@/lib/zod/bot-start-settings-schemas";
import {
  type TelegramGroupBotSettingsDto,
  telegramGroupBotSettingsSchema,
} from "@/lib/zod/telegram-group-bot-settings-schemas";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { BotConfigHeader } from "./bot-config-header";
import { BotConfigRefreshButton } from "./bot-config-refresh-button";
import { BotConfigSaveBar } from "./bot-config-save-bar";
import {
  BotConfigDangerZone,
  BotConfigGeneralSection,
  BotConfigPermissionsSection,
} from "./bot-config-sections";
import { BotConfigStatusPanel } from "./bot-config-status-panel";

type BotConfigFormProps = {
  group: TelegramGroupDetailDto;
  automationSettings: TelegramBotStartSettingsResponseDto;
};

export function BotConfigForm({
  group,
  automationSettings,
}: BotConfigFormProps) {
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [automationValue, setAutomationValue] = useState(
    automationSettings.autoRemoveExpiredSubscribers,
  );
  const [savedAutomationValue, setSavedAutomationValue] = useState(
    automationSettings.autoRemoveExpiredSubscribers,
  );
  const { refresh, isPending: isRefreshing } = useRefreshTelegramGroup(
    group.id,
    group.title ?? undefined,
  );

  const form = useForm<TelegramGroupBotSettingsDto>({
    resolver: zodResolver(telegramGroupBotSettingsSchema),
    defaultValues: group.settings,
  });

  const enabled = useController({ control: form.control, name: "enabled" });
  const notifyPermissionLoss = useController({
    control: form.control,
    name: "notifyPermissionLoss",
  });
  const hasAutomationChanges = automationValue !== savedAutomationValue;

  function readApiError(body: unknown, fallback: string) {
    return body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : fallback;
  }

  async function saveGroupSettings(valuesToSave: TelegramGroupBotSettingsDto) {
    const response = await fetch(
      `/api/telegram/groups/${encodeURIComponent(group.id)}/bot-settings`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(valuesToSave),
      },
    );

    const raw: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        readApiError(raw, "Não foi possível salvar as configurações."),
      );
    }

    const parsed = telegramGroupBotSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("A API retornou uma resposta inválida.");
    }

    return parsed.data;
  }

  async function saveAutomationSettings() {
    const response = await fetch("/api/bot-start-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        autoRemoveExpiredSubscribers: automationValue,
      }),
    });

    const raw: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        readApiError(
          raw,
          "Não foi possível salvar a configuração de automação.",
        ),
      );
    }

    const parsed = telegramBotStartSettingsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("A API retornou uma resposta inválida.");
    }

    return parsed.data;
  }

  async function handleSubmit(valuesToSave: TelegramGroupBotSettingsDto) {
    try {
      const [savedGroupSettings, savedAutomationSettings] = await Promise.all([
        form.formState.isDirty
          ? saveGroupSettings(valuesToSave)
          : Promise.resolve(valuesToSave),
        hasAutomationChanges ? saveAutomationSettings() : Promise.resolve(null),
      ]);

      form.reset(savedGroupSettings);
      if (savedAutomationSettings) {
        setAutomationValue(
          savedAutomationSettings.autoRemoveExpiredSubscribers,
        );
        setSavedAutomationValue(
          savedAutomationSettings.autoRemoveExpiredSubscribers,
        );
      }
      toast.success("Configurações salvas", {
        description: "O comportamento do bot foi atualizado para este grupo.",
      });
      router.refresh();
    } catch (error) {
      toast.error("Falha ao salvar", {
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar agora.",
      });
    }
  }

  return (
    <>
      <form
        className="relative flex flex-col gap-6 pb-20"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <BotConfigHeader
          group={group}
          actions={
            <BotConfigRefreshButton
              isRefreshing={isRefreshing}
              onRefresh={refresh}
            />
          }
        />

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-4">
            <BotConfigGeneralSection
              fields={{
                enabled: enabled.field,
                notifyPermissionLoss: notifyPermissionLoss.field,
              }}
              automationValue={automationValue}
              onAutomationChange={setAutomationValue}
            />
            <BotConfigPermissionsSection group={group} />
            <BotConfigDangerZone onDisconnect={() => setRemoveOpen(true)} />
          </div>

          <div className="min-w-0 space-y-4">
            <BotConfigStatusPanel group={group} />
          </div>
        </div>

        <BotConfigSaveBar
          visible={form.formState.isDirty || hasAutomationChanges}
          isSubmitting={form.formState.isSubmitting}
          onDiscard={() => {
            form.reset();
            setAutomationValue(savedAutomationValue);
          }}
        />
      </form>

      <RemoveGroupDialog
        groupId={group.id}
        groupTitle={group.title ?? ""}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
      />
    </>
  );
}
