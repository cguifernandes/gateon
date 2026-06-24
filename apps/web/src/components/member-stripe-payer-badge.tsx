import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type LinkedStripePlan =
  TelegramGroupSummaryDto["members"][number]["linkedStripePlans"][number];

type MemberStripePayerBadgeProps = {
  plans: LinkedStripePlan[];
  className?: string;
};

export function MemberStripePayerBadge({
  plans,
  className,
}: MemberStripePayerBadgeProps) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Badge
            {...triggerProps}
            variant="outline"
            className={cn(
              "inline-flex h-4 min-h-4 shrink-0 items-center justify-center px-1.5 py-0 text-[10px] leading-none font-medium whitespace-nowrap",
              "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300",
              triggerProps.className,
              className,
            )}
          >
            Stripe
          </Badge>
        )}
      />
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs flex flex-col gap-1! text-pretty"
      >
        <p className="font-medium text-xs">Pagante Stripe</p>
        {plans.length === 1 ? (
          <p className="text-xs">{plans[0]?.label}</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {plans.map((plan) => (
              <li key={plan.connectionId}>{plan.label}</li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
