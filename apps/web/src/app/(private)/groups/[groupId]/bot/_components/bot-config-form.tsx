"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useController, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRefreshTelegramGroup } from "@/app/(private)/groups/_hooks/use-refresh-telegram-group";
import { RemoveGroupDialog } from "@/components/remove-group-dialog";
import type { TelegramBotStartSettingsResponseDto } from "@/lib/zod/bot-start-settings-schemas";
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

  async function handleSubmit(valuesToSave: TelegramGroupBotSettingsDto) {
    try {
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
        const message =
          raw &&
          typeof raw === "object" &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : "Não foi possível salvar as configurações.";
        throw new Error(message);
      }

      const parsed = telegramGroupBotSettingsSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error("A API retornou uma resposta inválida.");
      }

      form.reset(parsed.data);
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
              automationSettings={automationSettings}
            />
            <BotConfigPermissionsSection group={group} />
            <BotConfigDangerZone onDisconnect={() => setRemoveOpen(true)} />
          </div>

          <div className="min-w-0 space-y-4">
            <BotConfigStatusPanel group={group} />
          </div>
        </div>

        <BotConfigSaveBar
          visible={form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
          onDiscard={() => form.reset()}
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
