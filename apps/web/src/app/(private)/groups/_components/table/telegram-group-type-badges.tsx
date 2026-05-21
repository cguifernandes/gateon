import { Badge } from "@/components/ui/badge";
import {
  getTelegramGroupTypeDisplay,
  type TelegramGroupTypeDisplay,
} from "@/lib/telegram-chat-type";
import { cn } from "@/lib/utils";

type TelegramGroupTypeBadgesProps = {
  type: string;
  isForum: boolean;
  className?: string;
  badgeClassName?: string;
};

export function TelegramGroupTypeBadges({
  type,
  isForum,
  className,
  badgeClassName,
}: TelegramGroupTypeBadgesProps) {
  const { typeLabel, forumLabel } = getTelegramGroupTypeDisplay(type, isForum);

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-[10px] font-medium text-muted-foreground",
          badgeClassName,
        )}
      >
        {typeLabel}
      </Badge>
      {forumLabel ? (
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[10px] font-medium text-primary",
            badgeClassName,
          )}
        >
          {forumLabel}
        </Badge>
      ) : null}
    </div>
  );
}

export function TelegramGroupTypeCell({
  type,
  isForum,
}: Pick<TelegramGroupTypeBadgesProps, "type" | "isForum">) {
  const { typeLabel, forumLabel } = getTelegramGroupTypeDisplay(type, isForum);

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="text-xs font-medium text-foreground">{typeLabel}</span>
      {forumLabel ? (
        <Badge
          variant="outline"
          className="shrink-0 text-[10px] font-medium text-primary"
        >
          {forumLabel}
        </Badge>
      ) : (
        <span className="text-[10px] text-muted-foreground">Sem tópicos</span>
      )}
    </div>
  );
}

export type { TelegramGroupTypeDisplay };
