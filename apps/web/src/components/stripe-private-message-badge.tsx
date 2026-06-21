"use client";

import { useRef } from "react";
import {
  MessageCircleIcon,
  type MessageCircleIconHandle,
} from "@/components/icons/message-circle";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const stripePrivateMessageTooltipText =
  "Este alerta será enviado no privado do membro. O Telegram só entrega se ele já conversou com o bot.";

type StripePrivateMessageBadgeProps = {
  className?: string;
};

export function StripePrivateMessageBadge({
  className,
}: StripePrivateMessageBadgeProps) {
  const iconRef = useRef<MessageCircleIconHandle | null>(null);

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Badge
            {...triggerProps}
            variant="outline"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 px-1.5 py-0 text-[10px]",
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
            <MessageCircleIcon
              ref={iconRef}
              size={12}
              isAnimateOnView={false}
              className="text-primary"
            />
            PV
          </Badge>
        )}
      />
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs text-pretty"
      >
        {stripePrivateMessageTooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
