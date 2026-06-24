"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";
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

function getErrorMessage(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

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
          getErrorMessage(body, "Não foi possível salvar o webhook."),
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
      <AccordionItem className="bg-transparent!" value="realtime-alerts">
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
          {!connection.webhookConfigured ? (
            guideExpanded ? (
              <div className="space-y-3">
                <StripeWebhookGuideContent />
                <div className="flex w-full justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setGuideExpanded(false)}
                  >
                    Ver menos
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <section
                  className={cn(
                    "space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading font-medium text-foreground text-sm">
                      Por que configurar o webhook?
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      Recomendado
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    A chave consulta dados na sincronização; o webhook avisa o
                    Gateon na hora. Na Stripe, crie o endpoint com a URL abaixo
                    e selecione os eventos de assinatura, fatura e checkout.
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Sem webhook, alertas automáticos só disparam ao
                    sincronizar. Com webhook ativo, chegam em tempo real ao
                    Telegram.
                  </p>
                </section>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-14 rounded-b-xl bg-linear-to-t from-background via-background/80 to-transparent backdrop-blur-[2px]"
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
              </div>
            )
          ) : null}

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
                  type="password"
                  autoComplete="off"
                  placeholder="whsec_..."
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  className="min-w-0"
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
              Eventos de assinatura e fatura disparam alertas automaticamente.
              Use &quot;Sincronizar&quot; apenas para atualizar métricas ou
              recuperar eventos perdidos.
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
