import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BotPermissionStatus = "active" | "missing" | "attention";

export type BotPermissionChecklistItem = {
  id: string;
  title: string;
  description: string;
  status: BotPermissionStatus;
};

const STATUS_DISPLAY: Record<
  BotPermissionStatus,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
    iconClassName: string;
  }
> = {
  active: {
    label: "Ativa",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    icon: CheckCircle2,
    iconClassName: "text-green-500",
  },
  missing: {
    label: "Ausente",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
    icon: XCircle,
    iconClassName: "text-red-500",
  },
  attention: {
    label: "Necessita atenção",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
    icon: AlertTriangle,
    iconClassName: "text-yellow-500",
  },
};

type BotPermissionsChecklistProps = {
  items: BotPermissionChecklistItem[];
  className?: string;
};

export function BotPermissionsChecklist({
  items,
  className,
}: BotPermissionsChecklistProps) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => {
        const display = STATUS_DISPLAY[item.status];
        const Icon = display.icon;

        return (
          <li
            key={item.id}
            className="flex gap-3 rounded-xl border border-border bg-card px-3 py-3"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className={display.iconClassName} size={18} />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground text-sm">
                  {item.title}
                </p>
                <Badge
                  variant="outline"
                  className={cn("rounded-full text-[11px]", display.className)}
                >
                  {display.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm leading-snug">
                {item.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
