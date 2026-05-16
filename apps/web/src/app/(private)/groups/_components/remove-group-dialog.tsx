"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { LoaderIcon } from "@/components/icons/loader";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeTelegramGroupAction } from "@/lib/server/remove-telegram-group.action";

type RemoveGroupDialogProps = {
  groupId: string;
  groupTitle: string;
};

export function RemoveGroupDialog({
  groupId,
  groupTitle,
}: RemoveGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const xIconRef = useRef<XIconHandle>(null);

  function handleConfirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("groupId", groupId);
      await removeTelegramGroupAction(formData);
      toast.success(`Grupo "${groupTitle}" desconectado com sucesso.`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
        onMouseEnter={() => xIconRef.current?.startAnimation()}
        onMouseLeave={() => xIconRef.current?.stopAnimation()}
      >
        <XIcon ref={xIconRef} size={15} />
        <span className="sr-only">Remover grupo</span>
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desconectar grupo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover a conexão com{" "}
            <strong className="text-foreground">
              {groupTitle || "este grupo"}
            </strong>
            ? O bot será desativado e os membros não serão mais gerenciados
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            loading={isPending}
          >
            {isPending ? (
              <>
                <LoaderIcon size={14} /> Removendo…
              </>
            ) : (
              "Sim, remover"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
