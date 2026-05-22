"use client";

import { type ButtonHTMLAttributes, type ReactNode, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  createMemberActionTarget,
  useMemberActionHandler,
} from "@/lib/member-actions";
import { cn } from "@/lib/utils";
import { BanIcon, type BanIconHandle } from "./icons/ban";
import { BellIcon, type BellIconHandle } from "./icons/bell";
import { CopyIcon, type CopyIconHandle } from "./icons/copy";
import { UserMinusIcon, type UserMinusIconHandle } from "./icons/user-minus";

type MemberActionsToolbarProps = {
  groupId: string;
  telegramUserId: string;
  displayName: string;
  isInactive?: boolean;
  isOwner?: boolean;
  variant?: "overlay" | "inline";
  className?: string;
  onActionSuccess?: () => void;
};

type MemberActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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

function MemberActionButton({
  label,
  onClick,
  variant = "ghost",
  children,
  disabled,
  ...props
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
            disabled={disabled}
            onClick={(event) => {
              triggerProps.onClick?.(event);
              onClick();
              event.currentTarget.blur();
            }}
            {...props}
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
  groupId,
  telegramUserId,
  displayName,
  isInactive = false,
  isOwner = false,
  variant = "inline",
  className,
  onActionSuccess,
}: MemberActionsToolbarProps) {
  const { runAction, isPending } = useMemberActionHandler({
    onActionSuccess,
  });

  const target = useMemo(
    () =>
      createMemberActionTarget({
        groupId,
        telegramUserId,
        status: isInactive ? "left" : "active",
        isOwner,
      }),
    [groupId, telegramUserId, isInactive, isOwner],
  );

  const userMinusIconRef = useRef<UserMinusIconHandle>(null);
  const banIconRef = useRef<BanIconHandle>(null);
  const bellIconRef = useRef<BellIconHandle>(null);
  const copyIconRef = useRef<CopyIconHandle>(null);

  function handleMemberAction(
    action: "notice" | "remove" | "ban",
    options?: { onlyActive?: boolean },
  ) {
    runAction({
      action,
      targets: [target],
      onlyActive: options?.onlyActive,
    });
  }

  return (
    <div
      role="toolbar"
      aria-label={`Ações para ${displayName}`}
      className={cn(
        variant === "overlay"
          ? "pointer-events-none absolute inset-0 flex items-center justify-end gap-0.5 rounded-lg px-2 transition-[background-color,backdrop-filter] group-hover:pointer-events-auto group-hover:bg-background/40 group-hover:backdrop-blur-[2px] [&_button]:pointer-events-auto"
          : "flex items-center justify-end gap-0.5",
        className,
      )}
    >
      {!isInactive && !isOwner ? (
        <>
          <MemberActionButton
            label="Remover do grupo"
            variant="destructive"
            disabled={isPending}
            onClick={() => handleMemberAction("remove", { onlyActive: true })}
            onMouseEnter={() => {
              userMinusIconRef.current?.startAnimation();
            }}
            onMouseLeave={() => {
              userMinusIconRef.current?.stopAnimation();
            }}
          >
            <UserMinusIcon ref={userMinusIconRef} size={16} />
          </MemberActionButton>
          <MemberActionButton
            label="Banir usuário"
            variant="destructive"
            disabled={isPending}
            onClick={() => handleMemberAction("ban", { onlyActive: true })}
            onMouseEnter={() => {
              banIconRef.current?.startAnimation();
            }}
            onMouseLeave={() => {
              banIconRef.current?.stopAnimation();
            }}
          >
            <BanIcon ref={banIconRef} size={16} />
          </MemberActionButton>
        </>
      ) : null}

      <MemberActionButton
        label="Enviar aviso"
        disabled={isPending}
        onClick={() => handleMemberAction("notice")}
        onMouseEnter={() => {
          bellIconRef.current?.startAnimation();
        }}
        onMouseLeave={() => {
          bellIconRef.current?.stopAnimation();
        }}
      >
        <BellIcon ref={bellIconRef} size={16} />
      </MemberActionButton>
      <MemberActionButton
        label="Copiar ID do Telegram"
        disabled={isPending}
        onClick={() => void copyTelegramUserId(telegramUserId)}
        onMouseEnter={() => {
          copyIconRef.current?.startAnimation();
        }}
        onMouseLeave={() => {
          copyIconRef.current?.stopAnimation();
        }}
      >
        <CopyIcon ref={copyIconRef} size={16} />
      </MemberActionButton>
    </div>
  );
}
