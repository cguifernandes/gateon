"use client";

import type { ComponentType } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import { CircleErrorIcon } from "@/components/icons/circle-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TelegramGroupBotSettingsDto } from "@/lib/zod/telegram-group-bot-settings-schemas";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { BotAccessAutomationSwitch } from "./bot-access-automation-switch";
import {
  type BotPermissionStatus,
  buildBotPermissionItems,
} from "./bot-config-utils";
import { BotSettingSwitch } from "./bot-setting-switch";

type BotPermissionStatusIcon = ComponentType<{
  className?: string;
  size?: number;
  isAnimateOnView?: boolean;
  animateOnHover?: boolean;
}>;

const STATUS_DISPLAY: Record<
  BotPermissionStatus,
  {
    label: string;
    variant: "outline" | "destructive" | "alert";
    className?: string;
    dotClassName?: string;
    icon: BotPermissionStatusIcon;
    iconClassName: string;
  }
> = {
  active: {
    label: "Ativa",
    variant: "outline",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    dotClassName: "bg-green-500",
    icon: CircleCheckIcon,
    iconClassName: "text-green-500",
  },
  missing: {
    label: "Ausente",
    variant: "destructive",
    icon: CircleErrorIcon,
    iconClassName: "text-destructive",
  },
  attention: {
    label: "Necessita atenção",
    variant: "alert",
    icon: BadgeAlertIcon,
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
};

type GeneralFields = {
  enabled: ControllerRenderProps<TelegramGroupBotSettingsDto, "enabled">;
  notifyPermissionLoss: ControllerRenderProps<
    TelegramGroupBotSettingsDto,
    "notifyPermissionLoss"
  >;
};

export function BotConfigGeneralSection({
  fields,
  automationValue,
  onAutomationChange,
}: {
  fields: GeneralFields;
  automationValue: boolean;
  onAutomationChange: (checked: boolean) => void;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Configurações gerais</CardTitle>
        <CardDescription>
          Controle se o bot permanece ativo neste grupo e o que acontece quando
          a assinatura Stripe de um membro expira.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <BotSettingSwitch
          checked={fields.enabled.value}
          onCheckedChange={fields.enabled.onChange}
          title="Bot ativado"
          description="Define se o Gateon executa automações neste grupo."
          tooltip="Desativar pausa alertas e rotinas automáticas. O grupo permanece conectado ao painel e você pode reativar quando quiser."
        />
        <BotSettingSwitch
          checked={fields.notifyPermissionLoss.value}
          onCheckedChange={fields.notifyPermissionLoss.onChange}
          title="Avisar quando o bot perder permissões"
          description="Mostra um alerta no grupo quando permissões obrigatórias forem removidas."
          tooltip="Ajuda o administrador a corrigir permissões antes da automação parar."
        />
        <BotAccessAutomationSwitch
          value={automationValue}
          onChange={onAutomationChange}
        />
      </CardContent>
    </Card>
  );
}

type BotConfigPermissionsSectionProps = {
  group: TelegramGroupDetailDto;
};

export function BotConfigPermissionsSection({
  group,
}: BotConfigPermissionsSectionProps) {
  const items = buildBotPermissionItems(group.permissions);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Permissões do bot</CardTitle>
        <CardDescription>
          Permissões de administrador concedidas ao bot no Telegram.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => {
            const display = STATUS_DISPLAY[item.status];
            const Icon = display.icon;

            return (
              <li
                key={item.id}
                className="flex gap-3 rounded-xl border border-border bg-card px-3 py-3"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted">
                  <Icon
                    className={display.iconClassName}
                    size={18}
                    isAnimateOnView
                    animateOnHover
                  />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium leading-tight font-heading text-foreground text-sm">
                      {item.title}
                    </p>
                    <Badge
                      variant={display.variant}
                      className={cn(
                        "shrink-0 gap-1.5 font-medium",
                        display.className,
                      )}
                    >
                      {display.dotClassName ? (
                        <span
                          aria-hidden
                          className={cn(
                            "size-1.5 rounded-full",
                            display.dotClassName,
                          )}
                        />
                      ) : null}
                      {display.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm text-light leading-snug">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
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
    <Card className="rounded-xl border-destructive! ring-destructive/30 bg-destructive/5">
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
