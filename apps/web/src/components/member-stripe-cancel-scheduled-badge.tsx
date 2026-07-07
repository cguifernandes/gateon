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
  const hasCanceled = plans.some(
    (plan) => plan.cancelAtPeriodEnd || plan.canceledAt != null,
  );
  const hasCancelScheduled = plans.some((plan) => plan.cancelAtPeriodEnd);
  const hasCancelImmediate = plans.some(
    (plan) => !plan.cancelAtPeriodEnd && plan.canceledAt != null,
  );

  if (!hasCanceled) {
    return null;
  }

  console.log({ plans });

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
        {hasCancelScheduled && hasCancelImmediate ? (
          <>
            <p className="font-medium text-xs">Cancelamento realizado</p>
            <p className="text-xs text-center">
              Algumas assinaturas foram canceladas e outras ainda estão ativas
              até o fim do período pago.
            </p>
          </>
        ) : hasCancelScheduled ? (
          <>
            <p className="font-medium text-xs">Cancelamento agendado</p>
            <p className="text-xs text-center">
              A assinatura ainda está ativa na Stripe até o fim do período pago.
              O membro permanece no grupo até a assinatura expirar de fato.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-xs">Cancelamento imediato</p>
            <p className="text-xs text-center">
              A assinatura foi cancelada na Stripe. O membro perdeu o acesso ao
              plano.
            </p>
          </>
        )}
        {plans.length === 1 ? (
          <p className="text-xs">{plans[0]?.label}</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {plans.map((plan) => (
              <li key={plan.connectionId}>
                {plan.label}
                {plan.cancelAtPeriodEnd
                  ? " · Cancelamento agendado"
                  : plan.canceledAt
                    ? " · Cancelado"
                    : ""}
              </li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
