"use client";

import { useMemo } from "react";
import { XIcon } from "@/components/icons/x";
import { ImageComponent } from "@/components/image-component";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

const VISIBLE_CHIP_LIMIT = 2;

type GroupComboboxItem = {
  value: string;
  label: string;
  group: TelegramGroupSummaryDto;
};

type MembersGroupFilterOptionsProps = {
  groups: TelegramGroupSummaryDto[];
  value: string[];
  onChange: (value: string[]) => void;
};

function GroupOptionLabel({ group }: { group: TelegramGroupSummaryDto }) {
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
      <span className="truncate font-medium">{title}</span>
    </span>
  );
}

function normalizeSelectedIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function toComboboxItems(groups: TelegramGroupSummaryDto[]): GroupComboboxItem[] {
  return groups.map((group) => {
    const chatId = group.telegramChatId.trim();
    return {
      value: chatId,
      label: group.title?.trim() || "Sem título",
      group,
    };
  });
}

export function MembersGroupFilterOptions({
  groups,
  value,
  onChange,
}: MembersGroupFilterOptionsProps) {
  const anchor = useComboboxAnchor();
  const selectedIds = useMemo(() => normalizeSelectedIds(value), [value]);
  const hasGroupFilter = selectedIds.length > 0;

  const groupItems = useMemo(() => toComboboxItems(groups), [groups]);

  const selectedItems = useMemo(
    () => groupItems.filter((item) => selectedIds.includes(item.value)),
    [groupItems, selectedIds],
  );

  return (
    <div className="flex items-center gap-2">
      <Combobox
        multiple
        items={groupItems}
        value={selectedItems}
        onValueChange={(next) => {
          const nextItems = (next ?? []) as GroupComboboxItem[];
          onChange(nextItems.map((item) => item.value));
        }}
        isItemEqualToValue={(item, selected) => item.value === selected.value}
        itemToStringLabel={(item) => item.label}
      >
        <div
          ref={anchor}
          className={cn("min-w-0 flex-1", hasGroupFilter && "min-h-9")}
        >
          <ComboboxChips className="h-auto min-h-9 w-full py-1.5">
            <ComboboxValue>
              {(selected: GroupComboboxItem[] | null) => {
                const items = selected ?? [];
                const visibleItems = items.slice(0, VISIBLE_CHIP_LIMIT);
                const hiddenCount = items.length - visibleItems.length;

                return (
                  <>
                    {visibleItems.map((item) => (
                      <ComboboxChip key={item.value}>
                        {item.label}
                      </ComboboxChip>
                    ))}
                    {hiddenCount > 0 ? (
                      <span className="px-1 text-muted-foreground text-xs">
                        +{hiddenCount}
                      </span>
                    ) : null}
                    <ComboboxChipsInput
                      placeholder={
                        items.length > 0 ? "" : "Selecionar grupos"
                      }
                      className="min-w-12"
                    />
                  </>
                );
              }}
            </ComboboxValue>
          </ComboboxChips>
        </div>

        <ComboboxContent
          anchor={anchor}
          align="start"
          className="z-60 w-[min(100vw-2rem,20rem)]"
        >
          <ComboboxList>
            {(item: GroupComboboxItem) => (
              <ComboboxItem key={item.value} value={item} className="py-2">
                <GroupOptionLabel group={item.group} />
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>Nenhum grupo encontrado.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      {hasGroupFilter ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 shrink-0"
          aria-label="Remover filtro de grupos"
          onClick={() => onChange([])}
        >
          <XIcon size={14} aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
