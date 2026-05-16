import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BotStatus = string;

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dotClassName: string }
> = {
  active: {
    label: "Ativo",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    dotClassName: "bg-green-500",
  },
  connected: {
    label: "Ativo",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    dotClassName: "bg-green-500",
  },
  inactive: {
    label: "Inativo",
    className:
      "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
    dotClassName: "bg-zinc-400",
  },
  error: {
    label: "Erro",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
    dotClassName: "bg-red-500",
  },
  failed: {
    label: "Falha",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
    dotClassName: "bg-red-500",
  },
  pending: {
    label: "Pendente",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  waiting: {
    label: "Aguardando",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
};

function resolveStatus(rawStatus: BotStatus) {
  const key = rawStatus.toLowerCase().replace(/_/g, "");
  if (key in STATUS_CONFIG) {
    return STATUS_CONFIG[key];
  }
  if (key.includes("active") || key.includes("connect")) {
    return STATUS_CONFIG.active;
  }
  if (key.includes("fail") || key.includes("error")) {
    return STATUS_CONFIG.error;
  }
  if (key.includes("pend") || key.includes("wait")) {
    return STATUS_CONFIG.pending;
  }
  return STATUS_CONFIG.inactive;
}

type GroupStatusBadgeProps = {
  status: BotStatus;
  className?: string;
};

export function GroupStatusBadge({ status, className }: GroupStatusBadgeProps) {
  const config = resolveStatus(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 border px-2 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      {config.label}
    </Badge>
  );
}
