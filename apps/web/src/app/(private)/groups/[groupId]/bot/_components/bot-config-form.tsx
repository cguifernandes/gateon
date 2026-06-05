"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useRefreshTelegramGroup } from "@/app/(private)/groups/_hooks/use-refresh-telegram-group";
import { RemoveGroupDialog } from "@/components/remove-group-dialog";
import {
  type TelegramGroupBotSettingsDto,
  telegramGroupBotSettingsSchema,
} from "@/lib/zod/telegram-group-bot-settings-schemas";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { BotConfigHeader } from "./bot-config-header";
import { BotConfigQuickActions } from "./bot-config-quick-actions";
import { BotConfigSaveBar } from "./bot-config-save-bar";
import {
  BotConfigDangerZone,
  BotConfigGeneralSection,
  BotConfigNotificationsSection,
  BotConfigPermissionsSection,
  WelcomePreview,
} from "./bot-config-sections";
import { BotConfigStatusPanel } from "./bot-config-status-panel";
import { renderWelcomePreview } from "./bot-config-utils";

type BotConfigFormProps = {
  group: TelegramGroupDetailDto;
};

export function BotConfigForm({ group }: BotConfigFormProps) {
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
  const welcomeEnabled = useController({
    control: form.control,
    name: "welcomeEnabled",
  });
  const privateMessageOnJoin = useController({
    control: form.control,
    name: "privateMessageOnJoin",
  });
  const notifyPermissionLoss = useController({
    control: form.control,
    name: "notifyPermissionLoss",
  });
  const welcomeMessage = useController({
    control: form.control,
    name: "welcomeMessage",
  });

  const welcomeMessageValue = useWatch({
    control: form.control,
    name: "welcomeMessage",
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
        <BotConfigHeader group={group} />
        <BotConfigQuickActions
          group={group}
          isRefreshing={isRefreshing}
          onRefreshPermissions={refresh}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <BotConfigGeneralSection
              fields={{
                enabled: enabled.field,
                welcomeEnabled: welcomeEnabled.field,
                privateMessageOnJoin: privateMessageOnJoin.field,
                welcomeMessage: welcomeMessage.field,
              }}
              errors={form.formState.errors}
            />
            <BotConfigPermissionsSection
              group={group}
              isRefreshing={isRefreshing}
              onRefreshPermissions={refresh}
            />
            <BotConfigNotificationsSection
              field={notifyPermissionLoss.field}
            />
            <BotConfigDangerZone onDisconnect={() => setRemoveOpen(true)} />
          </div>

          <div className="space-y-4">
            <BotConfigStatusPanel group={group} />
            <WelcomePreview
              message={renderWelcomePreview(welcomeMessageValue)}
            />
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
