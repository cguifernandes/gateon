"use client";

import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { BanIcon, type BanIconHandle } from "@/components/icons/ban";
import { BellIcon, type BellIconHandle } from "@/components/icons/bell";
import { CopyIcon, type CopyIconHandle } from "@/components/icons/copy";
import {
  UserMinusIcon,
  type UserMinusIconHandle,
} from "@/components/icons/user-minus";
import { ToolbarIconButton } from "@/components/toolbar-icon-button";
import {
  createMemberActionTarget,
  useMemberActionHandler,
} from "@/lib/members/actions";
import { cn } from "@/lib/utils";

type MemberActionsToolbarProps = {
  groupId: string;
  telegramUserId: string;
  displayName: string;
  isInactive?: boolean;
  isOwner?: boolean;
  variant?: "overlay" | "inline";
  className?: string;
  onActionSuccess?: () => void;
  onSendNotice?: () => void;
};

async function copyTelegramUserId(telegramUserId: string) {
  try {
    await navigator.clipboard.writeText(telegramUserId);
    toast.success("ID copiado", { description: telegramUserId });
  } catch {
    toast.error("Não foi possível copiar o ID.");
  }
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
  onSendNotice,
}: MemberActionsToolbarProps) {
  const { runAction, pendingAction } = useMemberActionHandler({
    onActionSuccess,
  });

  const isBusy = pendingAction !== null;

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

  const showMemberActions = !isInactive && !isOwner;

  return (
    <div
      role="toolbar"
      aria-label={`Ações para ${displayName}`}
      className={cn(
        variant === "overlay"
          ? "pointer-events-none absolute inset-0 flex items-center justify-end gap-0.5 rounded-lg px-2 opacity-0 transition-[opacity,background-color,backdrop-filter] group-hover:pointer-events-auto group-hover:opacity-100 group-hover:bg-background/40 group-hover:backdrop-blur-[2px] focus-within:pointer-events-auto focus-within:opacity-100 focus-within:bg-background/40 focus-within:backdrop-blur-[2px]"
          : "flex items-center justify-end gap-0.5",
        className,
      )}
    >
      {showMemberActions ? (
        <>
          <ToolbarIconButton
            label="Remover do grupo"
            variant="destructive"
            size="icon-xs"
            loading={pendingAction === "remove"}
            disabled={isBusy}
            onClick={() => handleMemberAction("remove", { onlyActive: true })}
            onMouseEnter={() => userMinusIconRef.current?.startAnimation()}
            onMouseLeave={() => userMinusIconRef.current?.stopAnimation()}
          >
            <UserMinusIcon ref={userMinusIconRef} size={16} />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="Banir usuário"
            variant="destructive"
            size="icon-xs"
            loading={pendingAction === "ban"}
            disabled={isBusy}
            onClick={() => handleMemberAction("ban", { onlyActive: true })}
            onMouseEnter={() => banIconRef.current?.startAnimation()}
            onMouseLeave={() => banIconRef.current?.stopAnimation()}
          >
            <BanIcon ref={banIconRef} size={16} />
          </ToolbarIconButton>
        </>
      ) : null}

      <ToolbarIconButton
        label="Enviar aviso"
        size="icon-xs"
        loading={pendingAction === "notice"}
        disabled={isBusy}
        onClick={() => {
          if (onSendNotice) {
            onSendNotice();
            return;
          }
          handleMemberAction("notice");
        }}
        onMouseEnter={() => bellIconRef.current?.startAnimation()}
        onMouseLeave={() => bellIconRef.current?.stopAnimation()}
      >
        <BellIcon ref={bellIconRef} size={16} />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Copiar ID do Telegram"
        size="icon-xs"
        disabled={isBusy}
        onClick={() => void copyTelegramUserId(telegramUserId)}
        onMouseEnter={() => copyIconRef.current?.startAnimation()}
        onMouseLeave={() => copyIconRef.current?.stopAnimation()}
      >
        <CopyIcon ref={copyIconRef} size={16} />
      </ToolbarIconButton>
    </div>
  );
}
