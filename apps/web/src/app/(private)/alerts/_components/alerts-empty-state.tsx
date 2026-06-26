import { CreateAlertDialog } from "@/components/create-alert-dialog-dynamic";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { StripeBillingConnectionDto } from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type AlertsEmptyStateProps = {
  groups: TelegramGroupSummaryDto[];
  stripeConnections: StripeBillingConnectionDto[];
  onCreated: () => void;
};

export function AlertsEmptyState({
  groups,
  stripeConnections,
  onCreated,
}: AlertsEmptyStateProps) {
  return (
    <Empty className="rounded-xl border border-border">
      <EmptyHeader>
        <EmptyMedia className="size-14 rounded-lg">
          <BadgeAlertIcon className="text-primary" size={24} />
        </EmptyMedia>
        <EmptyTitle>Nenhum alerta criado</EmptyTitle>
        <EmptyDescription className="max-w-sm text-pretty">
          Crie seu primeiro alerta para enviar mensagens a grupos, tópicos,
          membros ou automatizar avisos quando algo acontecer no Telegram.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex flex-wrap justify-center gap-2">
        <CreateAlertDialog
          groups={groups}
          stripeConnections={stripeConnections}
          onCreated={onCreated}
        />
      </EmptyContent>
    </Empty>
  );
}
