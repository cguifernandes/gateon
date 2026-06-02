"use client";

import { ptBR } from "date-fns/locale";
import { ImageComponent } from "@/components/image-component";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import type { AlertsFiltersControl } from "../_hooks/use-alerts-filters-url";

const statusFilterItems = [
  { id: "all", label: "Todos" },
  { id: "ACTIVE", label: "Ativos" },
  { id: "DRAFT", label: "Rascunhos" },
  { id: "PAUSED", label: "Pausados" },
  { id: "FAILED", label: "Falharam" },
] as const;

const destinationFilterItems = [
  { id: "all", label: "Todos" },
  { id: "GROUP", label: "Grupos" },
  { id: "TOPIC", label: "Tópicos" },
  { id: "MEMBERS", label: "Membros" },
  { id: "QUICK_ALERT", label: "Avisos Rápidos" },
  { id: "AUTOMATION", label: "Automações" },
] as const;

function GroupSelectLabel({ group }: { group: TelegramGroupSummaryDto }) {
  const title = group.title?.trim() || "Sem título";

  return (
    <span className="flex min-w-0 items-center gap-2">
      <ImageComponent
        src={
          group.chatPhotoUrl
            ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
            : null
        }
        alt={title}
        width={24}
        height={24}
        sizes="24px"
        className="size-6 shrink-0 rounded-md border border-border object-cover"
      />
      <span className="truncate">{title}</span>
    </span>
  );
}

type AlertsFiltersSidebarProps = {
  groups: TelegramGroupSummaryDto[];
  control: AlertsFiltersControl;
};

export function AlertsFiltersSidebar({
  groups,
  control,
}: AlertsFiltersSidebarProps) {
  const { draft } = control;

  return (
    <aside className="flex flex-col rounded-xl h-fit border border-border bg-card">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Status</span>

          {statusFilterItems.map((item) => {
            const isActive = draft.status === item.id;

            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => control.setStatus(item.id)}
                className={cn(
                  "w-full bg-transparent! justify-start hover:bg-primary/10!",
                  isActive &&
                    "bg-primary/10! text-primary hover:bg-primary/20! hover:text-primary",
                )}
              >
                {item.label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Destino</span>

          {destinationFilterItems.map((item) => {
            const isActive = draft.destination === item.id;

            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => control.setDestination(item.id)}
                className={cn(
                  "w-full bg-transparent! justify-start hover:bg-primary/10!",
                  isActive &&
                    "bg-primary/10! text-primary hover:bg-primary/20! hover:text-primary",
                )}
              >
                {item.label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Grupo</span>
          <Select
            value={draft.groupId}
            onValueChange={(value) => control.setGroupId(value)}
          >
            <SelectTrigger className="h-9 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <GroupSelectLabel group={group} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Data de criação</span>
          <Calendar
            mode="range"
            selected={draft.createdRange}
            onSelect={control.setCreatedRange}
            locale={ptBR}
            captionLayout="dropdown"
            startMonth={new Date(2010, 0)}
            endMonth={new Date()}
            classNames={{
              root: "rounded-lg border border-border",
            }}
          />
        </div>
      </div>

      <div className="mt-auto flex w-full shrink-0 gap-2 border-t border-border px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={control.clear}
        >
          Limpar
        </Button>
        <Button
          type="button"
          variant="default"
          className="flex-1"
          onClick={control.apply}
          disabled={!control.hasPendingChanges}
        >
          Aplicar filtros
        </Button>
      </div>
    </aside>
  );
}
