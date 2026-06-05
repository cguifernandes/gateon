"use client";

import {
  AlertTriangle,
  Bell,
  MessageSquareText,
  Power,
  Shield,
} from "lucide-react";
import { useId } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { BotPermissionsChecklist } from "@/components/bot-permissions-checklist";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { TelegramGroupBotSettingsDto } from "@/lib/zod/telegram-group-bot-settings-schemas";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { buildBotPermissionItems } from "./bot-config-utils";
import { BotSettingSwitch } from "./bot-setting-switch";

type GeneralFields = {
  enabled: ControllerRenderProps<TelegramGroupBotSettingsDto, "enabled">;
  welcomeEnabled: ControllerRenderProps<
    TelegramGroupBotSettingsDto,
    "welcomeEnabled"
  >;
  privateMessageOnJoin: ControllerRenderProps<
    TelegramGroupBotSettingsDto,
    "privateMessageOnJoin"
  >;
  welcomeMessage: ControllerRenderProps<
    TelegramGroupBotSettingsDto,
    "welcomeMessage"
  >;
};

type GeneralErrors = Partial<
  Record<keyof TelegramGroupBotSettingsDto, { message?: string }>
>;

export function BotConfigGeneralSection({
  fields,
  errors,
}: {
  fields: GeneralFields;
  errors: GeneralErrors;
}) {
  const welcomeMessageId = useId();

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Power size={16} /> Configurações gerais
        </CardTitle>
        <CardDescription>
          Controle o comportamento principal do bot neste grupo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <BotSettingSwitch
          checked={fields.enabled.value}
          onCheckedChange={fields.enabled.onChange}
          title="Bot ativado"
          description="Mantém as automações essenciais ligadas para este grupo."
          tooltip="Desligar pausa mensagens automáticas, mas não remove a integração."
          recommended
        />
        <BotSettingSwitch
          checked={fields.welcomeEnabled.value}
          onCheckedChange={fields.welcomeEnabled.onChange}
          title="Enviar mensagem de boas-vindas"
          description="Publica uma mensagem no grupo quando um novo membro entra."
          tooltip="Use {name} para personalizar com o nome do membro."
        />
        <BotSettingSwitch
          checked={fields.privateMessageOnJoin.value}
          onCheckedChange={fields.privateMessageOnJoin.onChange}
          title="Mensagem privada ao entrar"
          description="Tenta enviar uma mensagem no privado para orientar o novo membro."
          tooltip="O Telegram só permite DM se o usuário já iniciou conversa com o bot."
        />

        <div className="space-y-2 rounded-xl border border-border bg-background/70 p-3">
          <label
            htmlFor={welcomeMessageId}
            className="font-medium text-foreground text-sm"
          >
            Mensagem de boas-vindas personalizada
          </label>
          <Textarea
            id={welcomeMessageId}
            value={fields.welcomeMessage.value}
            onChange={fields.welcomeMessage.onChange}
            onBlur={fields.welcomeMessage.onBlur}
            name={fields.welcomeMessage.name}
            rows={4}
            aria-invalid={Boolean(errors.welcomeMessage)}
            placeholder="Bem-vindo, {name}!"
          />
          {errors.welcomeMessage?.message ? (
            <p className="text-destructive text-xs">
              {errors.welcomeMessage.message}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Dica: use <code>{"{name}"}</code> para inserir o nome do membro.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BotConfigPermissionsSection({
  group,
  onRefreshPermissions,
  isRefreshing,
}: {
  group: TelegramGroupDetailDto;
  onRefreshPermissions: () => void;
  isRefreshing: boolean;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield size={16} /> Permissões do bot
            </CardTitle>
            <CardDescription>
              Permissões de administrador concedidas ao bot no Telegram.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={onRefreshPermissions}
          >
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <BotPermissionsChecklist
          items={buildBotPermissionItems(group.permissions)}
        />
      </CardContent>
    </Card>
  );
}

export function BotConfigNotificationsSection({
  field,
}: {
  field: ControllerRenderProps<
    TelegramGroupBotSettingsDto,
    "notifyPermissionLoss"
  >;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell size={16} /> Notificações
        </CardTitle>
        <CardDescription>
          Receba alertas quando a saúde da integração mudar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BotSettingSwitch
          checked={field.value}
          onCheckedChange={field.onChange}
          title="Avisar quando o bot perder permissões"
          description="Mostra um alerta no grupo quando permissões obrigatórias forem removidas."
          tooltip="Ajuda o administrador a corrigir permissões antes da automação parar."
          recommended
        />
      </CardContent>
    </Card>
  );
}

export function BotConfigDangerZone({
  onDisconnect,
}: {
  onDisconnect: () => void;
}) {
  return (
    <Card className="rounded-xl border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle size={16} /> Zona de perigo
        </CardTitle>
        <CardDescription>
          Ações que interrompem a integração do bot com este grupo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground text-sm">
            Desconectar integração
          </p>
          <p className="text-muted-foreground text-sm">
            O bot sairá do grupo e o controle de acesso será desativado.
          </p>
        </div>
        <Button type="button" variant="destructive" onClick={onDisconnect}>
          Desconectar
        </Button>
      </CardContent>
    </Card>
  );
}

export function WelcomePreview({ message }: { message: string }) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText size={16} /> Preview da mensagem
        </CardTitle>
        <CardDescription>
          Como a mensagem aparece para novos membros.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
          {message}
        </div>
      </CardContent>
    </Card>
  );
}
