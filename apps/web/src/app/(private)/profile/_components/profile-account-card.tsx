import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPaidPlan, PLAN_LABELS } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";
import type { UserProfileDto } from "@/lib/zod/auth-schemas";
import { formatProfileDateTime } from "./profile-format";

type ProfileAccountCardProps = {
  profile: UserProfileDto;
};

type SummaryMetricProps = {
  label: string;
  children: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
};

function SummaryMetric({
  label,
  children,
  labelClassName,
  valueClassName,
}: SummaryMetricProps) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className={cn("text-muted-foreground text-xs", labelClassName)}>
        {label}
      </p>
      <div className={cn("mt-1 text-sm", valueClassName)}>{children}</div>
    </div>
  );
}

export function ProfileAccountCard({ profile }: ProfileAccountCardProps) {
  const { user, sessions } = profile;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da conta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <SummaryMetric label="E-mail">
            <span className="text-foreground">{user.email}</span>
          </SummaryMetric>
          <SummaryMetric label="E-mail verificado">
            {user.emailVerified ? (
              <Badge variant="default">Verificado</Badge>
            ) : (
              <Badge variant="outline">Não verificado</Badge>
            )}
          </SummaryMetric>
          <SummaryMetric label="Conta criada">
            <span className="text-foreground">
              {formatProfileDateTime(user.createdAt)}
            </span>
          </SummaryMetric>
          <SummaryMetric label="Última atualização">
            <span className="text-foreground">
              {formatProfileDateTime(user.updatedAt)}
            </span>
          </SummaryMetric>
          <SummaryMetric label="Plano Gateon">
            <Badge variant={isPaidPlan(user.planId) ? "default" : "outline"}>
              {PLAN_LABELS[user.planId]}
            </Badge>
          </SummaryMetric>
          <SummaryMetric label="Sessões ativas">
            <span className="font-medium text-foreground tabular-nums">
              {sessions.length}
            </span>
          </SummaryMetric>
        </div>
      </CardContent>
    </Card>
  );
}
