"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { PlusIcon, type PlusIconHandle } from "@/components/icons/plus";
import { Button } from "@/components/ui/button";

type CreateAlertDialogProps = ComponentProps<
  typeof import("./create-alert-dialog").CreateAlertDialog
>;

const CreateAlertDialogLazy = dynamic(
  () =>
    import("./create-alert-dialog").then((module) => ({
      default: module.CreateAlertDialog,
    })),
  { ssr: false },
);

export function CreateAlertDialog({
  buttonText = "Criar Novo Alerta",
  showTrigger = true,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  ...rest
}: CreateAlertDialogProps) {
  const plusIconRef = useRef<PlusIconHandle | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [dialogLoaded, setDialogLoaded] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  useEffect(() => {
    void import("./create-alert-dialog");
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

  if (!showTrigger && !dialogLoaded && !open) {
    return null;
  }

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="default"
          onClick={() => handleOpenChange(true)}
          onMouseEnter={() => plusIconRef.current?.startAnimation()}
          onMouseLeave={() => plusIconRef.current?.stopAnimation()}
        >
          <PlusIcon ref={plusIconRef} size={14} />
          {buttonText}
        </Button>
      ) : null}

      {dialogLoaded ? (
        <CreateAlertDialogLazy
          {...rest}
          buttonText={buttonText}
          showTrigger={false}
          open={open}
          onOpenChange={handleOpenChange}
        />
      ) : null}
    </>
  );
}
