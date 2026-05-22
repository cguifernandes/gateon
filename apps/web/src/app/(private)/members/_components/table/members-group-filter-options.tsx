"use client";

import { useMemo } from "react";
import { ImageComponent } from "@/components/image-component";
import { XIcon } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

const EMPTY_GROUP_FILTER_VALUE = "all";

type MembersGroupFilterOptionsProps = {
  groups: TelegramGroupSummaryDto[];
  value: string;
  onChange: (value: string) => void;
};

function GroupOptionLabel({ group }: { group: TelegramGroupSummaryDto }) {
  const title = group.title?.trim() || "Sem título";

  return (
    <span className="flex min-w-0 items-center gap-2">
      {group.chatPhotoUrl ? (
        <ImageComponent
          src={withCacheBuster(group.chatPhotoUrl, group.updatedAt)}
          alt={title}
          width={24}
          height={24}
          sizes="24px"
          className="size-6 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="size-6 shrink-0 rounded-md border border-border bg-muted"
        />
      )}
      <span className="truncate font-medium">{title}</span>
    </span>
  );
}

export function MembersGroupFilterOptions({
  groups,
  value,
  onChange,
}: MembersGroupFilterOptionsProps) {
  const hasGroupFilter = value !== EMPTY_GROUP_FILTER_VALUE;

  const selectedGroup = useMemo(
    () =>
      hasGroupFilter
        ? groups.find((group) => group.telegramChatId.trim() === value)
        : undefined,
    [groups, value, hasGroupFilter],
  );

  return (
    <div className="flex items-center gap-2">
      <Select
        value={hasGroupFilter ? value : undefined}
        onValueChange={onChange}
      >
        <SelectTrigger size="sm" className="h-auto min-h-9 min-w-0 flex-1 py-1.5">
          <SelectValue placeholder="Selecionar grupo">
            {selectedGroup ? <GroupOptionLabel group={selectedGroup} /> : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="z-60 max-h-60">
          {groups.map((group) => {
            const chatId = group.telegramChatId.trim();

            return (
              <SelectItem key={chatId} value={chatId} className={cn("py-2")}>
                <GroupOptionLabel group={group} />
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {hasGroupFilter ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 shrink-0"
          aria-label="Remover filtro de grupo"
          onClick={() => onChange(EMPTY_GROUP_FILTER_VALUE)}
        >
          <XIcon size={14} aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
