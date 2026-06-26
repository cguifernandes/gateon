import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

const MAX_VISIBLE_PLANS = 3;

type LinkedStripePlan = TelegramGroupSummaryDto["linkedStripePlans"][number];

type LinkedStripePlansCellProps = {
  plans: LinkedStripePlan[];
};

function PlanBadge({ plan }: { plan: LinkedStripePlan }) {
  if (!plan.cancelAtPeriodEnd) {
    return (
      <Badge variant="outline" className="max-w-full truncate text-[10px]">
        {plan.label}
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Badge
            {...triggerProps}
            variant="outline"
            className={cn(
              "max-w-full truncate text-[10px]",
              "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
              triggerProps.className,
            )}
          >
            {plan.label} · Cancelou
          </Badge>
        )}
      />
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs text-pretty text-xs"
      >
        Assinatura ainda ativa até o fim do período pago. Membros com este
        status permanecem no grupo até a assinatura expirar.
      </TooltipContent>
    </Tooltip>
  );
}

export function LinkedStripePlansCell({ plans }: LinkedStripePlansCellProps) {
  if (plans.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const visiblePlans = plans.slice(0, MAX_VISIBLE_PLANS);
  const hiddenPlans = plans.slice(MAX_VISIBLE_PLANS);

  return (
    <div className="flex flex-col items-center gap-1">
      {visiblePlans.map((plan) => (
        <PlanBadge key={plan.connectionId} plan={plan} />
      ))}

      {hiddenPlans.length > 0 ? (
        <Tooltip>
          <TooltipTrigger
            render={(triggerProps) => (
              <Badge
                {...triggerProps}
                variant="secondary"
                className="cursor-default text-[10px]"
              >
                +{hiddenPlans.length}
              </Badge>
            )}
          />
          <TooltipContent
            side="top"
            sideOffset={8}
            className="max-w-xs flex flex-col gap-1! text-pretty"
          >
            <p className="font-medium text-xs">Outros planos Stripe</p>
            <ul className="space-y-1 text-xs">
              {hiddenPlans.map((plan) => (
                <li key={plan.connectionId}>
                  {plan.label}
                  {plan.cancelAtPeriodEnd ? " · Cancelou" : ""}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
