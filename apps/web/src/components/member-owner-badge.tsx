import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MemberOwnerBadgeProps = {
  className?: string;
};

export function MemberOwnerBadge({ className }: MemberOwnerBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-4 min-h-4 shrink-0 items-center justify-center px-1.5 py-0 text-[10px] leading-none font-medium whitespace-nowrap",
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
        className,
      )}
    >
      Dono
    </Badge>
  );
}
