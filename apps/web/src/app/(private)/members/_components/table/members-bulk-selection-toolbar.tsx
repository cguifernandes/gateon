"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
  useRef,
} from "react";
import { toast } from "sonner";
import { BanIcon, type BanIconHandle } from "@/components/icons/ban";
import { BellIcon, type BellIconHandle } from "@/components/icons/bell";
import { CopyIcon, type CopyIconHandle } from "@/components/icons/copy";
import {
  UserMinusIcon,
  type UserMinusIconHandle,
} from "@/components/icons/user-minus";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGroupLimit } from "@/contexts/group-limit-context";
import {
  MEMBER_ACTION_UI_LABELS,
  type MemberBulkAction,
  useMemberActionHandler,
} from "@/lib/members/actions";
import { hasPlanFeature } from "@/lib/plan/features";
import { cn } from "@/lib/utils";
import type { SelectedMemberTarget } from "../members-table-helpers";

const BULK_ICON_SIZE = 14;

/** Toast result labels for bulk selection (shorter copy). */
const BULK_ACTION_RESULT_LABELS: Record<MemberBulkAction, string> = {
  notice: "Enviar aviso",
  remove: "Remover",
  ban: "Banir",
};

type MembersBulkSelectionToolbarProps = {
  selectedCount: number;
  selectedTargets: SelectedMemberTarget[];
  selectedTelegramUserIds: string[];
  hasRemovableMember: boolean;
  onClear: () => void;
  onSendNotice: () => void;
  className?: string;
};

async function copyTelegramUserIds(telegramUserIds: string[]) {
  if (telegramUserIds.length === 0) {
    return;
  }

  try {
    await navigator.clipboard.writeText(telegramUserIds.join(", "));
    toast.success(
      telegramUserIds.length === 1 ? "ID copiado" : "IDs copiados",
      {
        description:
          telegramUserIds.length === 1
            ? telegramUserIds[0]
            : `${telegramUserIds.length} IDs copiados para a área de transferência.`,
      },
    );
  } catch {
    toast.error("Não foi possível copiar os IDs.");
  }
}

type BulkToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "ghost" | "destructive";
  children: ReactNode;
};

function BulkToolbarButton({
  label,
  variant = "ghost",
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
  ...props
}: BulkToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className="shrink-0 rounded-full"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      {...props}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </Button>
  );
}

type BulkActionButtonsProps = {
  isPending: boolean;
  hasRemovableMember: boolean;
  selectedTelegramUserIds: string[];
  onSendNotice: () => void;
  onBulkAction: (action: MemberBulkAction) => void;
  bellIconRef: RefObject<BellIconHandle | null>;
  copyIconRef: RefObject<CopyIconHandle | null>;
  userMinusIconRef: RefObject<UserMinusIconHandle | null>;
  banIconRef: RefObject<BanIconHandle | null>;
};

function BulkActionButtons({
  isPending,
  hasRemovableMember,
  selectedTelegramUserIds,
  onSendNotice,
  onBulkAction,
  bellIconRef,
  copyIconRef,
  userMinusIconRef,
  banIconRef,
}: BulkActionButtonsProps) {
  return (
    <>
      <BulkToolbarButton
        label={MEMBER_ACTION_UI_LABELS.notice}
        disabled={isPending}
        onClick={() => {
          if (selectedTargets.some((target) => target.selectAllInGroup)) {
            runAction({
              action: "notice",
              targets: selectedTargets,
              plural: true,
              onAfterSuccess: () => onClear(),
            });
            return;
          }

          onSendNotice();
        }}
        onMouseEnter={() => bellIconRef.current?.startAnimation()}
        onMouseLeave={() => bellIconRef.current?.stopAnimation()}
      >
        <BellIcon ref={bellIconRef} size={BULK_ICON_SIZE} />
      </BulkToolbarButton>
      <BulkToolbarButton
        label="Copiar IDs"
        disabled={isPending}
        onClick={() => void copyTelegramUserIds(selectedTelegramUserIds)}
        onMouseEnter={() => copyIconRef.current?.startAnimation()}
        onMouseLeave={() => copyIconRef.current?.stopAnimation()}
      >
        <CopyIcon ref={copyIconRef} size={BULK_ICON_SIZE} />
      </BulkToolbarButton>

      {hasRemovableMember ? (
        <>
          <Separator
            orientation="vertical"
            className="my-auto hidden h-5 sm:block"
          />
          <BulkToolbarButton
            label="Remover"
            variant="destructive"
            disabled={isPending}
            onClick={() => onBulkAction("remove")}
            onMouseEnter={() => userMinusIconRef.current?.startAnimation()}
            onMouseLeave={() => userMinusIconRef.current?.stopAnimation()}
          >
            <UserMinusIcon ref={userMinusIconRef} size={BULK_ICON_SIZE} />
          </BulkToolbarButton>
          <BulkToolbarButton
            label="Banir"
            variant="destructive"
            disabled={isPending}
            onClick={() => onBulkAction("ban")}
            onMouseEnter={() => banIconRef.current?.startAnimation()}
            onMouseLeave={() => banIconRef.current?.stopAnimation()}
          >
            <BanIcon ref={banIconRef} size={BULK_ICON_SIZE} />
          </BulkToolbarButton>
        </>
      ) : null}
    </>
  );
}

export function MembersBulkSelectionToolbar({
  selectedCount,
  selectedTargets,
  selectedTelegramUserIds,
  hasRemovableMember,
  onClear,
  onSendNotice,
  className,
}: MembersBulkSelectionToolbarProps) {
  const { planId } = useGroupLimit();
  const { runAction, isPending } = useMemberActionHandler();
  const requiresBulkPlan = selectedCount > 1;
  const canUseBulkActions =
    !requiresBulkPlan || hasPlanFeature(planId, "bulkMemberActions");
  const bellIconRef = useRef<BellIconHandle>(null);
  const copyIconRef = useRef<CopyIconHandle>(null);
  const userMinusIconRef = useRef<UserMinusIconHandle>(null);
  const banIconRef = useRef<BanIconHandle>(null);
  const clearIconRef = useRef<XIconHandle>(null);

  if (selectedCount === 0) {
    return null;
  }

  const selectionLabel = selectedCount === 1 ? "selecionado" : "selecionados";

  function handleBulkAction(action: MemberBulkAction) {
    runAction({
      action,
      targets: selectedTargets,
      onlyActive: action !== "notice",
      plural: true,
      actionLabel: BULK_ACTION_RESULT_LABELS[action],
      onAfterSuccess: (completedAction) => {
        if (completedAction === "remove" || completedAction === "ban") {
          onClear();
        }
      },
    });
  }

  return (
    <div
      role="toolbar"
      aria-label={`${selectedCount} ${selectionLabel}`}
      className={cn(
        "pointer-events-none fixed overflow-hidden inset-x-0 bottom-6 z-50 flex justify-center px-1.5",
        className,
      )}
    >
      <div className="pointer-events-auto flex max-w-full items-center justify-center overflow-hidden gap-2 rounded-full border border-border bg-background/95 py-1.5 pr-1.5 pl-2 shadow-lg backdrop-blur-sm">
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {selectedCount}
          </span>
          <span className="font-semibold text-foreground text-sm whitespace-nowrap">
            {selectionLabel}
          </span>
        </div>

        <Separator
          orientation="vertical"
          className="my-auto hidden h-5 sm:block"
        />

        <div className="flex min-w-0 items-center overflow-hidden gap-2 overflow-x-auto">
          {requiresBulkPlan && !canUseBulkActions ? (
            <PlanFeatureGate
              feature="bulkMemberActions"
              className="min-h-9 min-w-48 flex-1"
              message="Ações em massa estão disponíveis a partir do plano Starter."
            >
              <BulkActionButtons
                isPending={isPending}
                hasRemovableMember={hasRemovableMember}
                selectedTelegramUserIds={selectedTelegramUserIds}
                onSendNotice={onSendNotice}
                onBulkAction={handleBulkAction}
                bellIconRef={bellIconRef}
                copyIconRef={copyIconRef}
                userMinusIconRef={userMinusIconRef}
                banIconRef={banIconRef}
              />
            </PlanFeatureGate>
          ) : (
            <BulkActionButtons
              isPending={isPending}
              hasRemovableMember={hasRemovableMember}
              selectedTelegramUserIds={selectedTelegramUserIds}
              onSendNotice={onSendNotice}
              onBulkAction={handleBulkAction}
              bellIconRef={bellIconRef}
              copyIconRef={copyIconRef}
              userMinusIconRef={userMinusIconRef}
              banIconRef={banIconRef}
            />
          )}
        </div>

        <Separator orientation="vertical" className="my-auto h-5" />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-full"
          aria-label="Limpar seleção"
          disabled={isPending}
          onClick={onClear}
          onMouseEnter={() => clearIconRef.current?.startAnimation()}
          onMouseLeave={() => clearIconRef.current?.stopAnimation()}
        >
          <XIcon ref={clearIconRef} size={16} />
        </Button>
      </div>
    </div>
  );
}
