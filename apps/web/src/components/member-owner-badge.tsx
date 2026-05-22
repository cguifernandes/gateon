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
        "h-4 w-max shrink-0 px-1.5 text-[10px] font-medium whitespace-nowrap",
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
        className,
      )}
    >
      Dono
    </Badge>
  );
}
