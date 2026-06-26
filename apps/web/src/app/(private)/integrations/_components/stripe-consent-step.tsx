"use client";

import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  BadgeAlertIcon,
  type BadgeAlertIconHandle,
} from "@/components/icons/badge-alert";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  StripeBillingConnectInput,
  StripeCatalogPriceDto,
} from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type StripeConsentStepProps = {
  form: UseFormReturn<StripeBillingConnectInput>;
  consentCheckboxId: string;
  selectedPrice: StripeCatalogPriceDto | null;
  selectedGroup: TelegramGroupSummaryDto | null;
  gatewayName?: string;
};

function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed) return "—";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 7)}••••${trimmed.slice(-4)}`;
}

type ReviewSummaryCellProps = {
  label: string;
  value: string;
  className?: string;
  lineClamp?: 2 | 3;
  valueClassName?: string;
};

function ReviewSummaryCell({
  label,
  value,
  className,
  lineClamp,
  valueClassName,
}: ReviewSummaryCellProps) {
  const valueTextClassName = cn(
    "mt-1 font-medium text-sm wrap-break-word",
    valueClassName,
  );

  return (
    <div className={cn("p-3", className)}>
      <p className="text-muted-foreground text-heading text-xs">{label}</p>
      {lineClamp ? (
        <TruncatedTextTooltip
          text={value}
          variant="line-clamp"
          lineClamp={lineClamp}
          className={valueTextClassName}
        />
      ) : (
        <p className={valueTextClassName}>{value}</p>
      )}
    </div>
  );
}

function formatReviewValue(value: string | undefined | null): string {
  if (!value?.trim()) return "—";
  return value;
}

export function StripeConsentStep({
  form,
  consentCheckboxId,
  selectedPrice,
  selectedGroup,
  gatewayName = "Stripe",
}: StripeConsentStepProps) {
  const consentInfoIconRef = useRef<BadgeAlertIconHandle | null>(null);
  const apiKey = form.watch("apiKey");

  const reviewTitle = selectedPrice?.productName ?? `Integração ${gatewayName}`;

  const reviewFields: {
    label: string;
    value: string;
    lineClamp?: 2 | 3;
    valueClassName?: string;
  }[] = [
    { label: "Gateway", value: formatReviewValue(gatewayName) },
    {
      label: "Chave informada",
      value: formatReviewValue(maskApiKey(apiKey)),
      valueClassName: "font-mono",
    },
    {
      label: "Produto monitorado",
      value: formatReviewValue(selectedPrice?.productName),
      lineClamp: 2,
    },
    {
      label: "Preço recorrente",
      value: formatReviewValue(selectedPrice?.priceLabel),
    },
    {
      label: "Grupo vinculado",
      value: formatReviewValue(selectedGroup?.title?.trim() || "Sem título"),
      lineClamp: 2,
    },
    {
      label: "ID do grupo",
      value: formatReviewValue(selectedGroup?.telegramChatId),
      valueClassName: "font-mono",
    },
  ];

  return (
    <FieldGroup className="gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <p className="font-medium font-heading text-muted-foreground text-xs uppercase tracking-wide">
            Revisão final
          </p>
          <h3 className="font-semibold font-heading text-2xl leading-tight">
            {reviewTitle}
          </h3>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-2">
          {reviewFields.map((field, index) => {
            const isLastOddCell =
              reviewFields.length % 2 === 1 &&
              index === reviewFields.length - 1;
            const isLeftCol = index % 2 === 0;
            const rowIndex = Math.floor(index / 2);
            const totalRows = Math.ceil(reviewFields.length / 2);

            return (
              <ReviewSummaryCell
                key={field.label}
                label={field.label}
                value={field.value}
                lineClamp={field.lineClamp}
                valueClassName={field.valueClassName}
                className={cn(
                  index < reviewFields.length - 1 && "border-border border-b",
                  "sm:border-b-0",
                  rowIndex < totalRows - 1 && "sm:border-border sm:border-b",
                  isLeftCol && !isLastOddCell && "sm:border-border sm:border-r",
                  isLastOddCell && "sm:col-span-2",
                )}
              />
            );
          })}
        </div>
      </div>

      <section className="rounded-xl border border-border p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          Ao conectar, o Gateon irá
        </p>
        <ul className="mt-3 space-y-2 text-muted-foreground text-xs font-light leading-relaxed">
          <li>
            Validar a chave e salvar a conexão com acesso{" "}
            <span className="font-medium text-foreground">somente leitura</span>
            .
          </li>
          <li>
            Sincronizar assinaturas, clientes e faturas{" "}
            <span className="font-medium text-foreground">
              apenas do plano selecionado
            </span>
            .
          </li>
          <li>
            Atualizar métricas do painel (assinantes ativos, receita mensal e
            alertas de vencimento).
          </li>
          <li>
            Enviar assinantes deste plano para o grupo{" "}
            <span className="font-medium text-foreground">
              {formatReviewValue(selectedGroup?.title?.trim() || "Sem título")}
            </span>{" "}
            após a confirmação do pagamento.
          </li>
          <li>
            Permitir que automações usem o status da assinatura para controlar
            acesso aos grupos.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          Próximo passo: webhook
        </p>
        <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
          Após conectar, configure o webhook no card da integração para que
          alertas de pagamento, cancelamento e vencimento disparem{" "}
          <span className="font-medium text-foreground">automaticamente</span>,
          sem depender da sincronização manual.
        </p>
      </section>

      <section className="rounded-xl border border-border p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          Privacidade e limites
        </p>
        <ul className="mt-3 space-y-2 text-muted-foreground text-xs font-light leading-relaxed">
          <li>
            Não armazenamos dados de cartão, CPF ou outras informações sensíveis
            de pagamento.
          </li>
          <li>
            O Gateon{" "}
            <span className="font-medium text-foreground">
              não cria cobranças
            </span>{" "}
            nem altera assinaturas na Stripe.
          </li>
          <li>
            Por enquanto, apenas{" "}
            <span className="font-medium text-foreground">
              uma integração ativa
            </span>{" "}
            é permitida na plataforma.
          </li>
        </ul>
      </section>

      <FieldSet>
        <Field orientation="horizontal" className="items-start">
          <Checkbox
            id={consentCheckboxId}
            checked={form.watch("consentAccepted") === true}
            onCheckedChange={(checked) =>
              form.setValue(
                "consentAccepted",
                checked === true ? true : (false as true),
                {
                  shouldDirty: true,
                  shouldValidate: true,
                },
              )
            }
          />
          <FieldContent>
            <div className="flex items-center gap-2">
              <FieldLabel
                htmlFor={consentCheckboxId}
                className="w-fit font-medium"
              >
                Consentimento obrigatório
              </FieldLabel>
              <Tooltip>
                <TooltipTrigger
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className={cn(
                        "inline-flex shrink-0 border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground",
                        triggerProps.className,
                      )}
                      aria-label="Saiba mais sobre o consentimento"
                      onClick={(event) => {
                        event.stopPropagation();
                        triggerProps.onClick?.(event);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      onMouseEnter={(event) => {
                        triggerProps.onMouseEnter?.(event);
                        consentInfoIconRef.current?.startAnimation();
                      }}
                      onMouseLeave={(event) => {
                        triggerProps.onMouseLeave?.(event);
                        consentInfoIconRef.current?.stopAnimation();
                      }}
                    >
                      <BadgeAlertIcon
                        ref={consentInfoIconRef}
                        size={16}
                        isAnimateOnView={false}
                      />
                    </button>
                  )}
                />
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="max-w-xs text-pretty"
                >
                  Declaro que possuo autorização para utilizar os dados dos meus
                  clientes e que estou ciente de que as informações serão
                  utilizadas exclusivamente para automações e notificações
                  configuradas por mim.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-1 font-light text-muted-foreground text-xs leading-relaxed">
              Ao marcar, você confirma que pode usar os dados dos assinantes
              deste plano para automações e comunicações no Gateon.
            </p>
            {form.formState.errors.consentAccepted?.message ? (
              <FieldError>
                {form.formState.errors.consentAccepted.message}
              </FieldError>
            ) : null}
          </FieldContent>
        </Field>
      </FieldSet>
    </FieldGroup>
  );
}
