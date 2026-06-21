"use client";

import { ImageComponent } from "@/components/image-component";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withCacheBuster } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

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

type StripeLinkGroupSelectProps = {
  id: string;
  label?: string;
  groups: TelegramGroupSummaryDto[];
  value: string;
  onValueChange: (groupId: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function StripeLinkGroupSelect({
  id,
  label = "Grupo vinculado ao plano",
  groups,
  value,
  onValueChange,
  disabled,
  placeholder = "Selecione o grupo",
}: StripeLinkGroupSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || groups.length === 0}
      >
        <SelectTrigger id={id} className="h-9 w-full rounded-lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              <GroupSelectLabel group={group} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
