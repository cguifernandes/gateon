import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

const MAX_VISIBLE_PLANS = 3;

type LinkedStripePlan = TelegramGroupSummaryDto["linkedStripePlans"][number];

type LinkedStripePlansCellProps = {
  plans: LinkedStripePlan[];
};

export function LinkedStripePlansCell({ plans }: LinkedStripePlansCellProps) {
  if (plans.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const visiblePlans = plans.slice(0, MAX_VISIBLE_PLANS);
  const hiddenPlans = plans.slice(MAX_VISIBLE_PLANS);

  return (
    <div className="flex flex-col items-center gap-1">
      {visiblePlans.map((plan) => (
        <Badge
          key={plan.connectionId}
          variant="outline"
          className="max-w-full truncate text-[10px]"
        >
          {plan.label}
        </Badge>
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
                <li key={plan.connectionId}>{plan.label}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
