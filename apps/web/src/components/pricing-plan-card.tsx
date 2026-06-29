"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatedNumberFlow } from "@/components/animated-number-flow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlanCatalogEntry } from "@/lib/plan/features";
import { cn } from "@/lib/utils";
import type { PlanId } from "@/lib/zod/plan-schemas";

export type PricingPlanMode = "marketing" | "account";

const HIGHLIGHTED_PLAN_CTA_CLASS =
  "bg-white text-primary hover:bg-white/90 disabled:bg-white/70 disabled:text-primary/70";

const HIGHLIGHTED_PLAN_MUTED_TEXT_CLASS = "text-white/80";

type PlanFeatureListProps = {
  bullets: string[];
  maxFeatures?: number;
  highlighted?: boolean;
};

function PlanFeatureList({
  bullets,
  maxFeatures,
  highlighted,
}: PlanFeatureListProps) {
  const visibleBullets =
    maxFeatures !== undefined ? bullets.slice(0, maxFeatures) : bullets;

  return (
    <ul
      className={cn(
        "space-y-2 text-sm",
        highlighted
          ? HIGHLIGHTED_PLAN_MUTED_TEXT_CLASS
          : "text-muted-foreground",
      )}
    >
      {visibleBullets.map((item) => (
        <li key={item} className="flex gap-2 leading-relaxed">
          <span
            aria-hidden
            className={cn(
              "mt-2 size-1.5 shrink-0 rounded-full",
              highlighted ? "bg-white" : "bg-primary",
            )}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

type PricingPlanCta = {
  label: string;
  href: string | null;
  disabled: boolean;
  variant: "default" | "outline";
};

function resolvePlanCta(input: {
  plan: PlanCatalogEntry;
  mode: PricingPlanMode;
  currentPlanId: PlanId;
}): PricingPlanCta {
  const { plan, mode, currentPlanId } = input;
  const isCurrent = plan.id === currentPlanId;

  if (mode === "account") {
    if (isCurrent) {
      return {
        label: "Plano atual",
        href: null,
        disabled: true,
        variant: "outline",
      };
    }

    if (plan.id === "free") {
      return {
        label: "Plano gratuito",
        href: null,
        disabled: true,
        variant: "outline",
      };
    }

    return {
      label: "Assinar",
      href: null,
      disabled: true,
      variant: plan.highlighted ? "default" : "outline",
    };
  }

  if (plan.id === "free") {
    return {
      label: "Começar grátis",
      href: "/register",
      disabled: false,
      variant: "outline",
    };
  }

  return {
    label: "Assinar",
    href: "/register",
    disabled: false,
    variant: plan.highlighted ? "default" : "outline",
  };
}

export type PricingPlanCtaOverride = {
  label: string;
  href: string | null;
  disabled?: boolean;
  variant?: "default" | "outline";
};

export type PricingPlanCardProps = {
  plan: PlanCatalogEntry;
  mode: PricingPlanMode;
  currentPlanId: PlanId;
  scaled?: boolean;
  maxFeatures?: number;
  ctaOverride?: PricingPlanCtaOverride;
  extraFooter?: ReactNode;
  patternClassName?: string;
};

export function PricingPlanCard({
  plan,
  mode,
  currentPlanId,
  scaled = true,
  maxFeatures,
  ctaOverride,
  patternClassName,
  extraFooter,
}: PricingPlanCardProps) {
  const resolvedCta = resolvePlanCta({ plan, mode, currentPlanId });
  const cta = ctaOverride
    ? {
        label: ctaOverride.label,
        href: ctaOverride.href,
        disabled: ctaOverride.disabled ?? false,
        variant: ctaOverride.variant ?? resolvedCta.variant,
      }
    : resolvedCta;
  const hasMoreFeatures =
    maxFeatures !== undefined && plan.featureBullets.length > maxFeatures;
  const isCurrent = plan.id === currentPlanId;

  return (
    <div
      className={cn(
        "relative pt-4",
        scaled && plan.highlighted && "lg:scale-105",
        patternClassName,
      )}
    >
      {isCurrent ? (
        <Badge
          className={cn(
            "absolute top-[6px] left-1/2 z-10 -translate-x-1/2",
            plan.highlighted && "bg-white text-primary",
          )}
        >
          Atual
        </Badge>
      ) : null}
      <Card
        className={cn(
          "relative flex h-full flex-col rounded-xl border border-border shadow-sm ring-0",
          plan.highlighted &&
            "border-0! bg-linear-to-br from-primary via-primary to-primary/50 text-white",
        )}
      >
        <CardHeader className="space-y-2">
          <CardTitle
            className={cn(
              "text-2xl font-semibold",
              plan.highlighted && "text-white",
            )}
          >
            {plan.label}
          </CardTitle>
          <CardDescription
            className={cn(
              plan.highlighted
                ? HIGHLIGHTED_PLAN_MUTED_TEXT_CLASS
                : "text-muted-foreground",
            )}
          >
            {plan.description}
          </CardDescription>
          <div
            className={cn(
              "flex items-baseline gap-1 font-heading font-semibold text-3xl tracking-tight",
              plan.highlighted && "text-white",
            )}
          >
            <span>R$</span>
            <AnimatedNumberFlow
              startValue={0}
              finalValue={(plan.priceCents ?? 0) / 100}
              className="font-semibold tracking-tight"
            />
            {plan.priceCents !== null ? (
              <span
                className={cn(
                  "font-normal text-sm",
                  plan.highlighted
                    ? HIGHLIGHTED_PLAN_MUTED_TEXT_CLASS
                    : "text-muted-foreground",
                )}
              >
                / mês
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <PlanFeatureList
            bullets={plan.featureBullets}
            maxFeatures={maxFeatures}
            highlighted={plan.highlighted}
          />
          {hasMoreFeatures && cta.href ? (
            <Button
              className={cn(
                "mt-3 w-full",
                plan.highlighted && HIGHLIGHTED_PLAN_CTA_CLASS,
              )}
              variant={plan.highlighted ? "secondary" : "default"}
              render={<Link href={cta.href} />}
            >
              Ver mais
            </Button>
          ) : null}
          {extraFooter ? <div className="mt-4">{extraFooter}</div> : null}
        </CardContent>
        {hasMoreFeatures ? null : (
          <CardFooter
            className={cn(
              "flex border-t flex-col gap-2",
              plan.highlighted ? "border-0!" : "border-border",
            )}
          >
            {cta.disabled || !cta.href ? (
              <Button
                className={cn(
                  "w-full",
                  plan.highlighted && HIGHLIGHTED_PLAN_CTA_CLASS,
                )}
                variant={plan.highlighted ? "secondary" : cta.variant}
                disabled={cta.disabled}
              >
                {cta.label}
              </Button>
            ) : (
              <Button
                className={cn(
                  "w-full",
                  plan.highlighted && HIGHLIGHTED_PLAN_CTA_CLASS,
                )}
                variant={plan.highlighted ? "secondary" : cta.variant}
                render={<Link href={cta.href} />}
              >
                {cta.label}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
