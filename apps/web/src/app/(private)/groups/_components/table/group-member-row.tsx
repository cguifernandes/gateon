"use client";

import { BanIcon, BellIcon, CopyIcon, UserMinusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { telegramGroupChatMemberSchema } from "@/lib/zod/telegram-group-connection-schemas";

export type GroupMemberRowData = z.infer<typeof telegramGroupChatMemberSchema>;

type GroupMemberRowProps = {
  member: GroupMemberRowData;
  displayName: string;
  updatedAt: string | null;
  formatDateTime: (value: string) => string;
};

function getMemberInitials(member: GroupMemberRowData) {
  const letter = member.firstName?.[0] ?? member.username?.[0] ?? "?";
  return letter.toUpperCase();
}

async function copyTelegramUserId(telegramUserId: string) {
  try {
    await navigator.clipboard.writeText(telegramUserId);
    toast.success("ID copiado", { description: telegramUserId });
  } catch {
    toast.error("Não foi possível copiar o ID.");
  }
}

function notifyActionComingSoon(label: string) {
  toast.info("Em breve", {
    description: `${label} estará disponível em uma próxima atualização.`,
  });
}

type MemberActionButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "ghost" | "destructive";
  children: ReactNode;
};

function MemberActionButton({
  label,
  onClick,
  variant = "ghost",
  children,
}: MemberActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant={variant}
            size="icon-xs"
            className={triggerProps.className}
            aria-label={label}
            onClick={(event) => {
              triggerProps.onClick?.(event);
              onClick();
              event.currentTarget.blur();
            }}
          >
            {children}
          </Button>
        )}
      />
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function GroupMemberRow({
  member,
  displayName,
  updatedAt,
  formatDateTime,
}: GroupMemberRowProps) {
  return (
    <li className="group relative flex gap-3 rounded-lg border border-border bg-card p-2.5">
      <Avatar className="size-9 shrink-0">
        {member.profilePhotoUrl ? (
          <AvatarImage src={member.profilePhotoUrl} alt={displayName} />
        ) : null}
        <AvatarFallback className="text-xs font-semibold uppercase">
          {getMemberInitials(member)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-0.5 pr-1">
        <p className="truncate font-medium text-foreground text-sm">
          {displayName}
        </p>
        {member.username ? (
          <p className="truncate text-muted-foreground text-xs">
            @{member.username}
          </p>
        ) : null}
        {updatedAt ? (
          <p className="text-[10px] text-muted-foreground">
            Atualizado em {formatDateTime(updatedAt)}
          </p>
        ) : null}
      </div>

      <div
        className="absolute inset-0 flex items-center justify-end gap-0.5 rounded-lg bg-background/40 px-2 opacity-100 backdrop-blur-[2px] transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
        role="toolbar"
        aria-label={`Ações para ${displayName}`}
      >
        <MemberActionButton
          label="Remover do grupo"
          variant="destructive"
          onClick={() => notifyActionComingSoon("Remover do grupo")}
        >
          <UserMinusIcon className="size-3.5" />
        </MemberActionButton>
        <MemberActionButton
          label="Banir usuário"
          variant="destructive"
          onClick={() => notifyActionComingSoon("Banir usuário")}
        >
          <BanIcon className="size-3.5" />
        </MemberActionButton>
        <MemberActionButton
          label="Enviar aviso"
          onClick={() => notifyActionComingSoon("Enviar aviso")}
        >
          <BellIcon className="size-3.5" />
        </MemberActionButton>
        <MemberActionButton
          label="Copiar ID do Telegram"
          onClick={() => void copyTelegramUserId(member.telegramUserId)}
        >
          <CopyIcon className="size-3.5" />
        </MemberActionButton>
      </div>
    </li>
  );
}
