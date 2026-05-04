import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  layout?: "split" | "stack";
}

export function FeatureCard({
  title,
  description,
  children,
  className,
  layout = "split",
}: FeatureCardProps) {
  const isStack = layout === "stack";

  return (
    <Card
      className={cn(
        "h-full min-h-0 rounded-3xl border border-border bg-card p-6 ring-0 md:p-8",
        isStack ? "gap-6" : "gap-8",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 gap-6",
          isStack ? "flex-col" : "flex-col lg:flex-row lg:items-start lg:gap-8",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 flex-col gap-4",
            !isStack && "lg:max-w-[46%] lg:justify-center",
          )}
        >
          <div className="space-y-2">
            <h3 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
              {title}
            </h3>
            <p className="text-sm font-light text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className={cn("relative h-full min-w-0 flex-1")}>{children}</div>
      </div>
    </Card>
  );
}
