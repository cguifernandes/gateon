import { AnimatedNumberFlow } from "@/components/animated-number-flow";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  suffix?: string;
};

export function StatCard({ title, value, description, suffix }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <p className="font-heading font-medium text-muted-foreground">
          {title}
        </p>
        <AnimatedNumberFlow
          startValue={0}
          finalValue={Number(value)}
          suffix={suffix}
          className="text-3xl font-bold text-foreground"
        />
      </div>
      <p className="text-sm font-light text-muted-foreground">{description}</p>
    </div>
  );
}
