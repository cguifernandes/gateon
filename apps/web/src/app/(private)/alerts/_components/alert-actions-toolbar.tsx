"use client";

import { useRef, useState } from "react";
import { CopyIcon, type CopyIconHandle } from "@/components/icons/copy";
import { PauseIcon, type PauseIconHandle } from "@/components/icons/pause";
import { PlayIcon, type PlayIconHandle } from "@/components/icons/play";
import { RocketIcon, type RocketIconHandle } from "@/components/icons/rocket";
import { Trash2Icon, type Trash2IconHandle } from "@/components/icons/trash-2";
import { ToolbarIconButton } from "@/components/toolbar-icon-button";
import {
  type AlertAction,
  runAlertActionWithToasts,
} from "@/lib/alerts/actions";

const playPauseIconClassName = "transition-transform hover:scale-110";

type AlertActionsToolbarProps = {
  alertId: string;
  isActive: boolean;
  isAutomation?: boolean;
  onActionSuccess?: (action: AlertAction) => void | Promise<void>;
  isQuickAlert?: boolean;
};

export function AlertActionsToolbar({
  alertId,
  isActive,
  isAutomation = false,
  onActionSuccess,
  isQuickAlert = false,
}: AlertActionsToolbarProps) {
  const copyIconRef = useRef<CopyIconHandle>(null);
  const deleteIconRef = useRef<Trash2IconHandle>(null);
  const rocketIconRef = useRef<RocketIconHandle>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const pauseIconRef = useRef<PauseIconHandle>(null);
  const playIconRef = useRef<PlayIconHandle>(null);

  async function runAction(action: AlertAction) {
    if (pendingAction !== null) {
      return;
    }

    setPendingAction(action);
    try {
      const { success } = await runAlertActionWithToasts(alertId, action);
      if (success) {
        await onActionSuccess?.(action);
      }
    } finally {
      setPendingAction(null);
    }
  }

  const isBusy = pendingAction !== null;

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg bg-background/40 px-1 py-0.5 backdrop-blur-[2px]"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {!isQuickAlert && !isAutomation && (
        <ToolbarIconButton
          label="Executar agora"
          loading={pendingAction === "run"}
          disabled={isBusy}
          stopPointerPropagation
          onClick={() => {
            void runAction("run");
          }}
          onMouseEnter={() => rocketIconRef.current?.startAnimation()}
          onMouseLeave={() => rocketIconRef.current?.stopAnimation()}
        >
          <RocketIcon ref={rocketIconRef} size={16} />
        </ToolbarIconButton>
      )}

      <ToolbarIconButton
        label="Duplicar"
        loading={pendingAction === "duplicate"}
        disabled={isBusy}
        stopPointerPropagation
        onClick={() => {
          void runAction("duplicate");
        }}
        onMouseEnter={() => copyIconRef.current?.startAnimation()}
        onMouseLeave={() => copyIconRef.current?.stopAnimation()}
      >
        <CopyIcon ref={copyIconRef} size={16} />
      </ToolbarIconButton>
      {isAutomation ? (
        <ToolbarIconButton
          label={isActive ? "Pausar" : "Ativar"}
          disabled={isBusy}
          stopPointerPropagation
          loading={pendingAction === "pause" || pendingAction === "activate"}
          onClick={() => {
            void runAction(isActive ? "pause" : "activate");
          }}
          onMouseEnter={() =>
            isActive
              ? pauseIconRef.current?.startAnimation()
              : playIconRef.current?.startAnimation()
          }
          onMouseLeave={() =>
            isActive
              ? pauseIconRef.current?.stopAnimation()
              : playIconRef.current?.stopAnimation()
          }
        >
          {isActive ? (
            <PauseIcon
              ref={pauseIconRef}
              size={16}
              className={playPauseIconClassName}
            />
          ) : (
            <PlayIcon
              ref={playIconRef}
              size={16}
              className={playPauseIconClassName}
            />
          )}
        </ToolbarIconButton>
      ) : null}
      <ToolbarIconButton
        label="Excluir"
        variant="destructive"
        loading={pendingAction === "delete"}
        disabled={isBusy}
        stopPointerPropagation
        onClick={() => {
          void runAction("delete");
        }}
        onMouseEnter={() => deleteIconRef.current?.startAnimation()}
        onMouseLeave={() => deleteIconRef.current?.stopAnimation()}
      >
        <Trash2Icon ref={deleteIconRef} size={16} />
      </ToolbarIconButton>
    </div>
  );
}
