import { AnimatedNumberFlow } from "@/components/animated-number-flow";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  suffix?: string;
  className?: string;
  textClassName?: string;
  showDescription?: boolean;
};

export function StatCard({
  title,
  value,
  description,
  suffix,
  className,
  textClassName,
  showDescription = true,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card flex flex-col gap-4 p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className={cn("font-heading font-medium text-muted-foreground")}>
          {title}
        </p>
        <AnimatedNumberFlow
          startValue={0}
          finalValue={Number(value)}
          suffix={suffix}
          className={cn("text-3xl font-bold text-foreground", textClassName)}
        />
      </div>
      {showDescription && (
        <p className="text-sm font-light text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
