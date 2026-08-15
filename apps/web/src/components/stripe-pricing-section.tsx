"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PlanCardPlan } from "@/components/pricing-plan-card";
import { PricingPlanCard } from "@/components/pricing-plan-card";
import { cn } from "@/lib/utils";
import type { AvailablePlan } from "@/lib/zod/billing-schemas";
import type { PlanId } from "@/lib/zod/plan-schemas";
import { LoaderIcon } from "./icons/loader";

type StripePricingSectionProps = {
  currentPlanId?: PlanId;
  className?: string;
};

function formatInterval(interval: string | null, count: number | null): string {
  if (!interval) return "";
  const mapping: Record<string, string> = {
    month: "mês",
    year: "ano",
    week: "semana",
    day: "dia",
  };
  const label = mapping[interval] ?? interval;
  if (count && count > 1) {
    return `a cada ${count} ${label}s`;
  }
  return `/ ${label}`;
}

function stripePlanToCard(ap: AvailablePlan): PlanCardPlan {
  const intervalLabel = ap.interval
    ? formatInterval(ap.interval, ap.intervalCount)
    : null;

  return {
    id: ap.id,
    planId: ap.planId ?? ap.id,
    label: ap.name,
    description: ap.description,
    price: ap.price,
    currency: ap.currency,
    interval: ap.interval,
    intervalLabel,
    features: ap.features,
    highlighted: ap.isHighlight,
    priceCents: Math.round(ap.price * 100),
  };
}

const freeCard: PlanCardPlan = {
  id: "free",
  planId: "free",
  label: "Gratuito",
  description: "Comece a automatizar seu primeiro grupo pago sem custo.",
  price: 0,
  currency: "BRL",
  interval: null,
  intervalLabel: null,
  features: [
    "1 grupo conectado",
    "Até 75 membros por grupo",
    "Alertas de entrada e saída",
    "Até 2 modelos de alerta",
    "1 Produto da Stripe vinculado",
    "Sincronização manual dos produtos Stripe",
  ],
  highlighted: false,
};

export function StripePricingSection({
  currentPlanId = "free",
  className,
}: StripePricingSectionProps) {
  const [stripePlans, setStripePlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/billing/products");
        if (!res.ok) throw new Error("Falha ao buscar planos");
        const data: AvailablePlan[] = await res.json();
        setStripePlans(data);
      } catch {
        toast.error("Erro ao carregar planos da Stripe", {
          description:
            "Ocorreu um desconhecido ao buscar os planos. Por favor, entre em contato com o suporte!",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleSubscribe = useCallback(async (priceId: string) => {
    setCheckingOut(priceId);
    try {
      const baseUrl = window.location.origin;
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: `${baseUrl}/subscription?checkout=success`,
          cancelUrl: `${baseUrl}/subscription?checkout=canceled`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Falha ao criar checkout");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar checkout", {
        description:
          "Ocorreu um erro ao iniciar o checkout. Por favor, entre em contato com o suporte.",
      });
    } finally {
      setCheckingOut(null);
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
    try {
      const baseUrl = window.location.origin;
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: `${baseUrl}/subscription` }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Falha ao abrir portal");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao abrir portal de gerenciamento",
        {
          description:
            "Ocorreu um erro ao abrir o portal. Por favor, entre em contato com o suporte.",
        },
      );
    }
  }, []);

  if (loading) {
    return (
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          className,
        )}
      >
        <LoaderIcon animateOnHover={false} size={32} />
      </div>
    );
  }

  const paidCards = stripePlans
    .filter((p) => p.planId !== "free")
    .map((p) => stripePlanToCard(p));

  const cards = [freeCard, ...paidCards];

  const highlightedIndex = cards.findIndex((card) => card.highlighted);

  let sortedCards = cards;

  if (highlightedIndex > -1) {
    const highlighted = cards[highlightedIndex];
    const others = cards.filter((_, index) => index !== highlightedIndex);

    sortedCards = [others[0], highlighted, others[1]];
  }

  if (sortedCards.length === 1) {
    return (
      <section
        className={cn(
          "space-y-8 w-full flex items-center justify-center flex-1",
          className,
        )}
      >
        <p className="text-center text-muted-foreground">
          Nenhum plano disponível no momento.
        </p>
      </section>
    );
  }

  const hasPaidPlan = currentPlanId === "starter" || currentPlanId === "pro";

  return (
    <section className={cn("space-y-8 w-full flex-1", className)}>
      <div className="space-y-2 text-center">
        <h2 className="font-heading text-3xl font-semibold leading-[1.08] tracking-tight text-foreground">
          Planos para cada fase do seu negócio
        </h2>
        <p className="mx-auto max-w-2xl font-light text-muted-foreground text-sm sm:text-base">
          Encontre o plano que melhor atende às suas necessidades. Cancele
          quando quiser.
        </p>
      </div>

      <div className="grid gap-6 overflow-visible pt-1 lg:grid-cols-3">
        {sortedCards.map((card) => {
          const isCurrent = card.planId === currentPlanId;

          const action =
            isCurrent && hasPaidPlan
              ? {
                  label: "Gerenciar assinatura",
                  onClick: handleManageSubscription,
                  variant: card.highlighted
                    ? ("secondary" as const)
                    : ("outline" as const),
                }
              : !isCurrent
                ? {
                    label: "Selecionar plano",
                    onClick: () => handleSubscribe(card.id),
                    loading: checkingOut === card.id,
                    variant: card.highlighted
                      ? ("secondary" as const)
                      : ("default" as const),
                  }
                : undefined;

          return (
            <PricingPlanCard
              key={card.id}
              plan={card}
              mode="account"
              currentPlanId={currentPlanId}
              action={action}
            />
          );
        })}
      </div>
    </section>
  );
}
