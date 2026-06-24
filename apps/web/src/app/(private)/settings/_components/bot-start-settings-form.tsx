"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { toast } from "sonner";
import { BotSettingSwitch } from "@/app/(private)/groups/[groupId]/bot/_components/bot-setting-switch";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultBotStartSettingsValues,
  type TelegramBotStartSettingsDto,
  type TelegramBotStartSettingsResponseDto,
  telegramBotStartSettingsResponseSchema,
  telegramBotStartSettingsSchema,
} from "@/lib/zod/bot-start-settings-schemas";
import { BotStartMessagePreview } from "./bot-start-message-preview";

type BotStartSettingsFormProps = {
  initialSettings: TelegramBotStartSettingsResponseDto;
};

function toFormValues(
  settings: TelegramBotStartSettingsResponseDto,
): TelegramBotStartSettingsDto {
  return {
    welcomeMessageEnabled: settings.welcomeMessageEnabled,
    welcomeMessage: settings.welcomeMessage ?? "",
    showStripePlans: settings.showStripePlans,
    stripeConnectionIds: settings.stripeConnectionIds,
    showPaymentButtons: settings.showPaymentButtons,
    paymentButtonConnectionIds: settings.paymentButtonConnectionIds,
    paymentButtonsGroupFirst: settings.paymentButtonsGroupFirst,
    showSupportHint: settings.showSupportHint,
    supportHintText: settings.supportHintText ?? "",
    showSubscribeSteps: settings.showSubscribeSteps,
    autoRemoveExpiredSubscribers: settings.autoRemoveExpiredSubscribers,
  };
}

export function BotStartSettingsForm({
  initialSettings,
}: BotStartSettingsFormProps) {
  const [publicStartUrl, setPublicStartUrl] = useState(
    initialSettings.publicStartUrl,
  );
  const [botUsername, setBotUsername] = useState(initialSettings.botUsername);
  const [availableConnections, setAvailableConnections] = useState(
    initialSettings.availableStripeConnections,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<"save" | "restore" | null>(
    null,
  );
  const publicStartUrlId = useId();
  const welcomeMessageId = useId();
  const supportHintId = useId();

  const form = useForm<TelegramBotStartSettingsDto>({
    resolver: zodResolver(telegramBotStartSettingsSchema),
    defaultValues: toFormValues(initialSettings),
  });

  const welcomeMessageEnabled = useController({
    control: form.control,
    name: "welcomeMessageEnabled",
  });
  const welcomeMessage = useController({
    control: form.control,
    name: "welcomeMessage",
  });
  const showStripePlans = useController({
    control: form.control,
    name: "showStripePlans",
  });
  const stripeConnectionIds = useController({
    control: form.control,
    name: "stripeConnectionIds",
  });
  const showPaymentButtons = useController({
    control: form.control,
    name: "showPaymentButtons",
  });
  const paymentButtonConnectionIds = useController({
    control: form.control,
    name: "paymentButtonConnectionIds",
  });
  const paymentButtonsGroupFirst = useController({
    control: form.control,
    name: "paymentButtonsGroupFirst",
  });
  const showSupportHint = useController({
    control: form.control,
    name: "showSupportHint",
  });
  const supportHintText = useController({
    control: form.control,
    name: "supportHintText",
  });
  const showSubscribeSteps = useController({
    control: form.control,
    name: "showSubscribeSteps",
  });

  const selectedConnectionIds = new Set(stripeConnectionIds.field.value);
  const selectedPaymentConnectionIds = new Set(
    paymentButtonConnectionIds.field.value,
  );

  function toggleStripeConnection(connectionId: string, checked: boolean) {
    const current = stripeConnectionIds.field.value;
    if (checked) {
      stripeConnectionIds.field.onChange([...current, connectionId]);
      return;
    }
    stripeConnectionIds.field.onChange(
      current.filter((id) => id !== connectionId),
    );
  }

  function togglePaymentConnection(connectionId: string, checked: boolean) {
    const current = paymentButtonConnectionIds.field.value;
    const nextIds = checked
      ? [...current, connectionId]
      : current.filter((id) => id !== connectionId);

    paymentButtonConnectionIds.field.onChange(nextIds);
  }

  async function persistSettings(
    values: TelegramBotStartSettingsDto,
    action: "save" | "restore",
  ) {
    setIsSaving(true);
    setSavingAction(action);
    try {
      const response = await fetch("/api/bot-start-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      const raw: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          raw && typeof raw === "object" && ("error" in raw || "message" in raw)
            ? typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : typeof (raw as { message?: unknown }).message === "string"
                ? (raw as { message: string }).message
                : "Não foi possível salvar as configurações."
            : "Não foi possível salvar as configurações.";
        throw new Error(message);
      }

      const parsed = telegramBotStartSettingsResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error("A API retornou uma resposta inválida.");
      }

      form.reset(toFormValues(parsed.data));
      setPublicStartUrl(parsed.data.publicStartUrl);
      setBotUsername(parsed.data.botUsername);
      setAvailableConnections(parsed.data.availableStripeConnections);
      return parsed.data;
    } finally {
      setIsSaving(false);
      setSavingAction(null);
    }
  }

  async function handleSubmit(values: TelegramBotStartSettingsDto) {
    try {
      await persistSettings(values, "save");
      toast.success("Configurações salvas", {
        description: "O comando /start do bot foi atualizado.",
      });
    } catch (error) {
      toast.error("Falha ao salvar", {
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar agora.",
      });
    }
  }

  async function handleRestoreDefaults() {
    try {
      form.reset(defaultBotStartSettingsValues);
      await persistSettings(defaultBotStartSettingsValues, "restore");
      toast.success("Padrão restaurado", {
        description: "As configurações do /start voltaram ao padrão do Gateon.",
      });
    } catch (error) {
      toast.error("Falha ao restaurar", {
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível restaurar agora.",
      });
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
      <Card className="rounded-xl lg:col-span-2">
        <CardHeader>
          <CardTitle>Configuração do bot</CardTitle>
          <CardDescription>
            Defina o que o bot envia quando alguém abre seu link público no
            Telegram. Use este fluxo para apresentar planos, grupos e
            orientações antes do vínculo com assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={publicStartUrlId}>Link público do bot</Label>
            <div className="flex gap-2">
              <Input
                id={publicStartUrlId}
                readOnly
                value={publicStartUrl}
                className="font-mono"
              />
              <CopyToClipboardButton
                value={publicStartUrl}
                label="Copiar link"
                successToast={{
                  title: "Link copiado",
                  description:
                    "Compartilhe com quem deve iniciar o bot no Telegram.",
                }}
                errorToast={{ title: "Não foi possível copiar o link." }}
              />
            </div>
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <aside className="min-w-0 xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1 xl:self-start">
              <BotStartMessagePreview
                control={form.control}
                botUsername={botUsername}
                availableStripeConnections={availableConnections}
              />
            </aside>

            <div className="order-last min-w-0 space-y-4 xl:order-0 xl:col-start-1 xl:row-start-1">
              <BotSettingSwitch
                checked={welcomeMessageEnabled.field.value}
                onCheckedChange={welcomeMessageEnabled.field.onChange}
                title="Mensagem de boas-vindas personalizada"
                description="Envia um texto inicial definido por você."
                tooltip="Ideal para apresentar o produto, regras do grupo ou tom de voz da sua marca."
              >
                {welcomeMessageEnabled.field.value ? (
                  <>
                    <Label htmlFor={welcomeMessageId}>
                      Texto de boas-vindas
                    </Label>
                    <Textarea
                      id={welcomeMessageId}
                      rows={5}
                      placeholder="Olá! Bem-vindo(a) ao assistente do criador..."
                      className="resize-y bg-background"
                      {...welcomeMessage.field}
                    />
                    {form.formState.errors.welcomeMessage ? (
                      <p className="text-destructive text-sm">
                        {form.formState.errors.welcomeMessage.message}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </BotSettingSwitch>

              <BotSettingSwitch
                checked={showStripePlans.field.value}
                onCheckedChange={showStripePlans.field.onChange}
                title="Listar planos Stripe"
                description="Mostra os planos monitorados nas integrações conectadas."
                tooltip="Exibe os preços configurados em Integrações. Deixe todos desmarcados para listar todos os planos ativos."
              >
                {showStripePlans.field.value ? (
                  availableConnections.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-center text-sm leading-relaxed">
                      Nenhuma integração Stripe com plano monitorado. Conecte e
                      configure um plano em{" "}
                      <Link
                        href="/integrations"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Integrações
                      </Link>
                      .
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground font-light text-sm">
                        Selecione quais planos exibir. Nenhuma seleção = todos
                        os planos monitorados.
                      </p>
                      <div className="space-y-2">
                        {availableConnections.map((connection) => {
                          const checked = selectedConnectionIds.has(
                            connection.id,
                          );
                          return (
                            <label
                              key={connection.id}
                              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/70 p-3"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleStripeConnection(
                                    connection.id,
                                    value === true,
                                  )
                                }
                                aria-label={`Plano ${connection.label}`}
                              />
                              <span className="min-w-0 space-y-1">
                                <span className="block font-medium text-sm">
                                  {connection.label}
                                </span>
                                <span className="block text-muted-foreground text-xs">
                                  {connection.monitoredStripePriceId ??
                                    "Sem price ID"}
                                  {" · "}
                                  Chave ····{connection.apiKeyLast4}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )
                ) : null}
              </BotSettingSwitch>

              <BotSettingSwitch
                checked={showPaymentButtons.field.value}
                onCheckedChange={showPaymentButtons.field.onChange}
                title="Botões de pagamento Stripe"
                description="Exibe botões no /start que abrem o checkout da Stripe para cada plano."
                tooltip="O grupo de destino de cada plano é definido em Integrações, ao vincular o produto Stripe."
              >
                {showPaymentButtons.field.value ? (
                  availableConnections.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-center text-sm leading-relaxed">
                      Conecte um plano em{" "}
                      <Link
                        href="/integrations"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Integrações
                      </Link>{" "}
                      para habilitar os botões.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground font-light text-sm">
                        Marque os planos com botão de checkout. O grupo de
                        destino de cada um é configurado em{" "}
                        <Link
                          href="/integrations"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Integrações
                        </Link>
                        .
                      </p>
                      <div className="space-y-2">
                        {availableConnections.map((connection) => {
                          const checked = selectedPaymentConnectionIds.has(
                            connection.id,
                          );
                          const missingGroup = !connection.linkedGroup;

                          return (
                            <div
                              key={`payment-${connection.id}`}
                              className="space-y-2 rounded-lg border border-border bg-background/70 p-3"
                            >
                              <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    togglePaymentConnection(
                                      connection.id,
                                      value === true,
                                    )
                                  }
                                  aria-label={`Pagamento ${connection.label}`}
                                />
                                <span className="min-w-0 space-y-1">
                                  <span className="block font-medium text-sm">
                                    {connection.label}
                                  </span>
                                  <span className="block text-muted-foreground text-xs">
                                    {connection.linkedGroup
                                      ? `Grupo: ${connection.linkedGroup.title}`
                                      : "Sem grupo vinculado em Integrações"}
                                  </span>
                                </span>
                              </label>
                              {checked && missingGroup ? (
                                <p className="pl-7 text-amber-600 text-xs dark:text-amber-500">
                                  Vincule um grupo a este plano em Integrações
                                  antes de salvar.
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <BotSettingSwitch
                        checked={paymentButtonsGroupFirst.field.value}
                        onCheckedChange={
                          paymentButtonsGroupFirst.field.onChange
                        }
                        title="Primeiro escolher o grupo"
                        description="Na primeira etapa, o visitante vê os grupos conectados; ao tocar em um, aparecem os planos disponíveis para aquele grupo."
                        tooltip="Útil quando você vende acesso a vários grupos com planos diferentes. O grupo de cada plano continua definido em Integrações."
                      />
                    </>
                  )
                ) : null}
              </BotSettingSwitch>

              <BotSettingSwitch
                checked={showSubscribeSteps.field.value}
                onCheckedChange={showSubscribeSteps.field.onChange}
                title="Passo a passo para assinar"
                description="Explica como o visitante assina pelo bot, paga na Stripe e recebe o acesso ao grupo."
                tooltip="Recomendado com botões de pagamento ativos. Inclui aviso de privacidade (LGPD) para o visitante."
              />

              <BotSettingSwitch
                checked={showSupportHint.field.value}
                onCheckedChange={showSupportHint.field.onChange}
                title="Dica de suporte"
                description="Mostra como o visitante pode tirar dúvidas."
                tooltip="Personalize o texto ou use o padrão do Gateon."
              >
                {showSupportHint.field.value ? (
                  <>
                    <Label htmlFor={supportHintId}>Texto de suporte</Label>
                    <Textarea
                      id={supportHintId}
                      rows={3}
                      placeholder="Dúvidas? Fale com o administrador..."
                      className="resize-y bg-background"
                      {...supportHintText.field}
                    />
                    {form.formState.errors.supportHintText ? (
                      <p className="text-destructive text-sm">
                        {form.formState.errors.supportHintText.message}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </BotSettingSwitch>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t-0 justify-end pt-0">
          <div className="flex flex-col-reverse w-full gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-40"
              disabled={isSaving}
              onClick={() => {
                void handleRestoreDefaults();
              }}
            >
              {savingAction === "restore"
                ? "Restaurando..."
                : "Restaurar padrão"}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-40"
              disabled={isSaving}
            >
              {savingAction === "save" ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
