"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { LoaderIcon } from "@/components/icons/loader";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
};

export function RemoveGroupDialog({
  groupId,
  groupTitle,
  open,
  onOpenChange,
  onRemoved,
}: RemoveGroupDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("groupId", groupId);
      await removeTelegramGroupAction(formData);
      toast.success(`Grupo "${groupTitle}" desconectado com sucesso.`);
      onOpenChange(false);
      onRemoved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Desconectar grupo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover a conexão com{" "}
            <strong className="text-foreground break-all">
              {groupTitle || "este grupo"}
            </strong>
            ? O bot será desativado e os membros não serão mais gerenciados
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
