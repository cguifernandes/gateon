type IntegrationStatCardProps = {
  title: string;
  value: string;
  description: string;
};

export function IntegrationStatCard({
  title,
  value,
  description,
}: IntegrationStatCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1">
        <p className="font-heading font-medium text-muted-foreground">
          {title}
        </p>
        <p className="font-bold text-3xl text-foreground">{value}</p>
      </div>
      <p className="font-light text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
