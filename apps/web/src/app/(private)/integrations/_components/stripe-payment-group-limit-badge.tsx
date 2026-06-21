"use client";

import { useRef } from "react";
import {
  BadgeAlertIcon,
  type BadgeAlertIconHandle,
} from "@/components/icons/badge-alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StripePaymentGroupLimit } from "@/lib/zod/stripe-payment-group-schemas";

type StripePaymentGroupLimitBadgeProps = {
  limit: StripePaymentGroupLimit;
  className?: string;
};

export function StripePaymentGroupLimitBadge({
  limit,
  className,
}: StripePaymentGroupLimitBadgeProps) {
  const iconRef = useRef<BadgeAlertIconHandle>(null);

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Badge
            {...triggerProps}
            variant="outline"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 px-1.5 py-0 text-[10px] font-normal",
              triggerProps.className,
              className,
            )}
            onClick={(event) => {
              event.stopPropagation();
              triggerProps.onClick?.(event);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseEnter={(event) => {
              iconRef.current?.startAnimation();
              triggerProps.onMouseEnter?.(event);
            }}
            onMouseLeave={(event) => {
              iconRef.current?.stopAnimation();
              triggerProps.onMouseLeave?.(event);
            }}
          >
            <BadgeAlertIcon
              ref={iconRef}
              size={12}
              isAnimateOnView={false}
              animateOnHover={false}
              className="text-primary"
            />
            {limit.planLabel} · {limit.usedDistinctGroups}/
            {limit.maxDistinctGroups}
          </Badge>
        )}
      />
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs space-y-2 text-pretty"
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed">
            Seu plano <span className="font-medium">{limit.planLabel}</span>{" "}
            permite vincular até{" "}
            <span className="font-medium">{limit.maxDistinctGroups}</span>{" "}
            grupo(s) diferente(s) aos produtos Stripe.
          </p>
          <p className="text-xs">
            O grupo escolhido recebe os pagantes após o checkout. Vários
            produtos podem usar o mesmo grupo sem gastar slots extras.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
