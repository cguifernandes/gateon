import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { cn } from "@/lib/utils";

export function formatReviewValue(
  value: string | number | undefined | null,
): string {
  if (value === undefined || value === null) return "-";
  if (typeof value === "string" && value.trim() === "") return "-";
  return String(value);
}

export function formatReviewBoolean(value: boolean | undefined): string {
  if (value === undefined) return "-";
  return value ? "Sim" : "Não";
}

export type AlertReviewField = {
  label: string;
  value: string;
  lineClamp?: 2 | 3;
  valueClassName?: string;
};

type ReviewSummaryCellProps = AlertReviewField & {
  className?: string;
};

export function ReviewSummaryCell({
  label,
  value,
  className,
  lineClamp,
  valueClassName,
}: ReviewSummaryCellProps) {
  const valueTextClassName = cn(
    "mt-1 font-medium text-sm wrap-break-word",
    valueClassName,
  );

  return (
    <div className={cn("p-3", className)}>
      <p className="text-muted-foreground text-heading text-xs">{label}</p>
      {lineClamp ? (
        <TruncatedTextTooltip
          text={value}
          variant="line-clamp"
          lineClamp={lineClamp}
          className={valueTextClassName}
        />
      ) : (
        <p className={valueTextClassName}>{value}</p>
      )}
    </div>
  );
}

type AlertReviewSummaryGridProps = {
  fields: AlertReviewField[];
  className?: string;
};

export function AlertReviewSummaryGrid({
  fields,
  className,
}: AlertReviewSummaryGridProps) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-lg border border-border sm:grid-cols-2",
        className,
      )}
    >
      {fields.map((field, index) => {
        const isLastOddCell =
          fields.length % 2 === 1 && index === fields.length - 1;
        const isLeftCol = index % 2 === 0;
        const rowIndex = Math.floor(index / 2);
        const totalRows = Math.ceil(fields.length / 2);

        return (
          <ReviewSummaryCell
            key={field.label}
            label={field.label}
            value={field.value}
            lineClamp={field.lineClamp}
            valueClassName={field.valueClassName}
            className={cn(
              index < fields.length - 1 && "border-border border-b",
              "sm:border-b-0",
              rowIndex < totalRows - 1 && "sm:border-border sm:border-b",
              isLeftCol && !isLastOddCell && "sm:border-border sm:border-r",
              isLastOddCell && "sm:col-span-2",
            )}
          />
        );
      })}
    </div>
  );
}

type AlertReviewSummaryProps = {
  title?: string;
  fields: AlertReviewField[];
  className?: string;
  heading?: string;
};

export function AlertReviewSummary({
  title,
  fields,
  className,
  heading = "Revisão",
}: AlertReviewSummaryProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-1">
        {heading ? (
          <p className="font-medium font-heading text-muted-foreground text-xs uppercase tracking-wide">
            {heading}
          </p>
        ) : null}
        {title ? (
          <h3 className="font-semibold font-heading text-2xl leading-tight">
            {title}
          </h3>
        ) : null}
      </div>
      <AlertReviewSummaryGrid fields={fields} />
    </div>
  );
}
