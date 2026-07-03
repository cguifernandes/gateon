"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readErrorBody } from "@/lib/http/read-error-body";
import { cn } from "@/lib/utils";
import {
  type StripeBillingConnectionDto,
  type StripeBillingStatusDto,
  stripeBillingStatusSchema,
} from "@/lib/zod/stripe-billing-schemas";
import { StripeWebhookGuideContent } from "./stripe-webhook-guide-content";

type StripeWebhookSetupProps = {
  connection: StripeBillingConnectionDto;
  onStatusChange: (status: StripeBillingStatusDto) => void;
};

export function StripeWebhookSetup({
  connection,
  onStatusChange,
}: StripeWebhookSetupProps) {
  const [secret, setSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);

  async function saveWebhookSecret() {
    const trimmed = secret.trim();
    if (!trimmed.startsWith("whsec_")) {
      toast.error("Signing secret inválido", {
        description: "Cole o valor que começa com whsec_ da Stripe.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/stripe-billing/${connection.id}/webhook-secret`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ webhookSigningSecret: trimmed }),
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          readErrorBody(body, "Não foi possível salvar o webhook."),
        );
      }

      const parsed = stripeBillingStatusSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("A resposta da API veio em formato inválido.");
      }

      onStatusChange(parsed.data);
      setSecret("");
      toast.success("Webhook configurado", {
        description: "Os alertas passam a disparar em tempo real.",
      });
    } catch (error) {
      toast.error("Falha ao configurar webhook", {
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Accordion className="gap-2">
      <AccordionItem value="realtime-alerts">
        <AccordionTrigger className="font-heading font-medium text-foreground text-sm hover:no-underline">
          <span className="flex flex-1 items-center justify-between gap-2 pr-2">
            <span className="text-base">Alertas em tempo real</span>
            <Badge
              variant={connection.webhookConfigured ? "default" : "secondary"}
              className="shrink-0"
            >
              {connection.webhookConfigured ? "Webhook ativo" : "Pendente"}
            </Badge>
          </span>
        </AccordionTrigger>

        <AccordionContent className="space-y-4 px-1.5 pt-0.5 pb-4">
          <PlanFeatureGate feature="stripeWebhook">
            <div className="space-y-4">
              {!connection.webhookConfigured && (
                <div className="space-y-3">
                  <div className="relative">
                    <div
                      className={cn(
                        !guideExpanded && "max-h-36 overflow-hidden",
                      )}
                    >
                      <StripeWebhookGuideContent />
                    </div>

                    {!guideExpanded && (
                      <>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-xl bg-linear-to-t from-background via-background/80 to-transparent backdrop-blur-[2px]"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setGuideExpanded(true)}
                          >
                            Ver mais
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {guideExpanded && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setGuideExpanded(false)}
                      >
                        Ver menos
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  URL do endpoint (cole na Stripe)
                </Label>
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    readOnly
                    value={connection.webhookEndpointUrl}
                    className="min-w-0 font-mono"
                  />
                  <CopyToClipboardButton
                    value={connection.webhookEndpointUrl}
                    label="Copiar URL"
                    successToast={{
                      title: "URL copiada",
                      description: "Cole no painel de webhooks da Stripe.",
                    }}
                    errorToast={{ title: "Não foi possível copiar a URL" }}
                  />
                </div>
              </div>

              {!connection.webhookConfigured ? (
                <div className="space-y-2">
                  <Label htmlFor={`webhook-secret-${connection.id}`}>
                    Signing secret da Stripe (whsec_...)
                  </Label>
                  <div className="flex min-w-0 items-center gap-2">
                    <Input
                      id={`webhook-secret-${connection.id}`}
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder="whsec_..."
                      value={secret}
                      onChange={(event) => setSecret(event.target.value)}
                      className="min-w-0 font-mono [-webkit-text-security:disc]"
                    />
                    <Button
                      type="button"
                      className="h-10 shrink-0 sm:w-40"
                      loading={isSaving}
                      onClick={saveWebhookSecret}
                    >
                      Ativar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Eventos de assinatura e fatura disparam alertas
                  automaticamente. Use &quot;Sincronizar&quot; apenas para
                  atualizar métricas ou recuperar eventos perdidos.
                </p>
              )}
            </div>
          </PlanFeatureGate>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
