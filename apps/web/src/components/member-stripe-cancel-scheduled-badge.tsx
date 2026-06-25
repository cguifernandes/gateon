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

type MemberStripeCancelScheduledBadgeProps = {
  plans: LinkedStripePlan[];
  className?: string;
};

export function MemberStripeCancelScheduledBadge({
  plans,
  className,
}: MemberStripeCancelScheduledBadgeProps) {
  const cancelScheduledPlans = plans.filter((plan) => plan.cancelAtPeriodEnd);

  if (cancelScheduledPlans.length === 0) {
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
              "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
              triggerProps.className,
              className,
            )}
          >
            Cancelou
          </Badge>
        )}
      />
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs flex flex-col gap-1! text-pretty"
      >
        <p className="font-medium text-xs">Cancelamento agendado</p>
        <p className="text-xs text-muted-foreground">
          A assinatura ainda está ativa na Stripe até o fim do período pago. O
          membro permanece no grupo até a assinatura expirar de fato.
        </p>
        {cancelScheduledPlans.length === 1 ? (
          <p className="text-xs">{cancelScheduledPlans[0]?.label}</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {cancelScheduledPlans.map((plan) => (
              <li key={plan.connectionId}>{plan.label}</li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
