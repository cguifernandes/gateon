import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  buildGroupLimitSnapshot,
  getMaxGroupsForPlan,
  getMaxManagedMembersPerGroupForPlan,
  getMaxStripePaymentGroupsForPlan,
  isPaidPlan,
  PLAN_LABELS,
} from "@/lib/plan/limits";
import { cn } from "@/lib/utils";
import type { UserProfileDto } from "@/lib/zod/auth-schemas";
import type { PlanId } from "@/lib/zod/plan-schemas";

type ProfileBottomSectionProps = {
  profile: UserProfileDto;
};

type PlanMetricProps = {
  label: string;
  value: ReactNode;
  hint?: string;
};

function PlanMetric({ label, value, hint }: PlanMetricProps) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-heading font-semibold text-xl tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const planLimitItems = [
  {
    key: "groups",
    label: "Grupos conectados",
    getLimit: (planId: PlanId) => getMaxGroupsForPlan(planId),
    getUsage: (stats: UserProfileDto["stats"]) => stats.telegramGroups,
  },
  {
    key: "membersPerGroup",
    label: "Membros por grupo",
    getLimit: (planId: PlanId) => getMaxManagedMembersPerGroupForPlan(planId),
    getUsage: null,
  },
  {
    key: "stripeStart",
    label: "Grupos Stripe no /start",
    getLimit: (planId: PlanId) => getMaxStripePaymentGroupsForPlan(planId),
    getUsage: (stats: UserProfileDto["stats"]) => stats.stripeConnections,
  },
] as const;

export function ProfileBottomSection({ profile }: ProfileBottomSectionProps) {
  const { user, stats } = profile;
  const isFree = !isPaidPlan(user.planId);
  const maxGroups = getMaxGroupsForPlan(user.planId);
  const groupLimit = buildGroupLimitSnapshot(stats.telegramGroups, maxGroups);
  const groupUsagePercent =
    maxGroups > 0
      ? Math.min(100, Math.round((stats.telegramGroups / maxGroups) * 100))
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura Gateon</CardTitle>
        <CardDescription>
          Plano, limites de uso e opções para escalar sua operação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="font-heading font-semibold text-2xl">
              {PLAN_LABELS[user.planId]}
            </p>
            <p className="text-muted-foreground text-sm">
              {isFree ? (
                <>
                  Faça upgrade para a{" "}
                  <Link
                    href="/subscription"
                    className={cn(
                      buttonVariants({ variant: "link" }),
                      "w-fit p-0 h-fit text-sm!",
                    )}
                  >
                    Assinatura
                  </Link>{" "}
                  e libere mais grupos, membros e integrações.
                </>
              ) : (
                "Seu plano está ativo com os limites abaixo."
              )}
            </p>
          </div>
        </div>

        <section className="space-y-3 rounded-xl border border-border bg-primary/10 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-foreground">Uso de grupos</p>
            <p className="tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">
                {stats.telegramGroups}
              </span>
              {" / "}
              {maxGroups}
            </p>
          </div>
          <Progress value={groupUsagePercent} className="h-1.5" />
          <p className="text-muted-foreground text-xs leading-relaxed">
            {groupLimit.isAtLimit
              ? "Limite de grupos do plano atingido."
              : `${groupLimit.remaining} ${groupLimit.remaining === 1 ? "vaga disponível" : "vagas disponíveis"} para conectar novos grupos.`}
          </p>
        </section>

        <section className="space-y-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Limites do plano
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            {planLimitItems.map((item) => {
              const limit = item.getLimit(user.planId);
              const usage = item.getUsage?.(stats);

              return (
                <PlanMetric
                  key={item.key}
                  label={item.label}
                  value={
                    usage !== undefined && usage !== null ? (
                      <>
                        {usage}
                        <span className="text-muted-foreground text-sm font-normal">
                          {" "}
                          / {limit}
                        </span>
                      </>
                    ) : (
                      limit
                    )
                  }
                />
              );
            })}
          </dl>
        </section>
      </CardContent>
    </Card>
  );
}
