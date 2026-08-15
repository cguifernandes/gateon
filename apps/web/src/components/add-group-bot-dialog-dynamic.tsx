"use client";

import dynamic from "next/dynamic";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGroupLimit } from "@/contexts/group-limit-context";
import { cn } from "@/lib/utils";

type AddGroupBotDialogProps = ComponentProps<
  typeof import("./add-group-bot-dialog").AddGroupBotDialog
>;

const AddGroupBotDialogLazy = dynamic(
  () =>
    import("./add-group-bot-dialog").then((module) => ({
      default: module.AddGroupBotDialog,
    })),
  { ssr: false },
);

export function AddGroupBotDialog({
  presentation = "default",
  triggerClassName,
  showTrigger = true,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  ...rest
}: AddGroupBotDialogProps) {
  const { canAddGroup, isAtLimit, maxGroups } = useGroupLimit();
  const [internalOpen, setInternalOpen] = useState(false);
  const [dialogLoaded, setDialogLoaded] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  useEffect(() => {
    void import("./add-group-bot-dialog");
  }, []);

  useEffect(() => {
    if (open) {
      setDialogLoaded(true);
    }
  }, [open]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setDialogLoaded(true);
      }

      if (isControlled) {
        onOpenChangeProp?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [isControlled, onOpenChangeProp],
  );

  const limitTitle = isAtLimit
    ? `Limite de ${maxGroups} grupos atingido no plano atual`
    : undefined;

  const openDialog = useCallback(() => {
    if (!canAddGroup) {
      return;
    }

    handleOpenChange(true);
  }, [canAddGroup, handleOpenChange]);

  if (!showTrigger && !dialogLoaded && !open) {
    return null;
  }

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="default"
          disabled={!canAddGroup}
          title={limitTitle}
          className={cn("w-full sm:w-auto", triggerClassName)}
          onClick={openDialog}
        >
          Conectar um grupo
        </Button>
      ) : null}

      {dialogLoaded ? (
        <AddGroupBotDialogLazy
          {...rest}
          presentation={presentation}
          triggerClassName={triggerClassName}
          showTrigger={false}
          open={open}
          onOpenChange={handleOpenChange}
        />
      ) : null}
    </>
  );
}
