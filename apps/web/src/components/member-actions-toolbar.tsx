"use client";

import { BanIcon, BellIcon, CopyIcon, UserMinusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MemberActionsToolbarProps = {
  telegramUserId: string;
  displayName: string;
  isInactive?: boolean;
  variant?: "overlay" | "inline";
  className?: string;
};

type MemberActionButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "ghost" | "destructive";
  children: ReactNode;
};

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

export function MemberActionsToolbar({
  telegramUserId,
  displayName,
  isInactive = false,
  variant = "inline",
  className,
}: MemberActionsToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={`Ações para ${displayName}`}
      className={cn(
        variant === "overlay"
          ? "absolute inset-0 flex items-center justify-end gap-0.5 rounded-lg bg-background/40 px-2 backdrop-blur-[2px]"
          : "flex items-center justify-end gap-0.5",
        className,
      )}
    >
      {!isInactive ? (
        <>
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
        </>
      ) : null}

      <MemberActionButton
        label="Enviar aviso"
        onClick={() => notifyActionComingSoon("Enviar aviso")}
      >
        <BellIcon className="size-3.5" />
      </MemberActionButton>
      <MemberActionButton
        label="Copiar ID do Telegram"
        onClick={() => void copyTelegramUserId(telegramUserId)}
      >
        <CopyIcon className="size-3.5" />
      </MemberActionButton>
    </div>
  );
}
