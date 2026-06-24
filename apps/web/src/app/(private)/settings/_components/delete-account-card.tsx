"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LoaderIcon } from "@/components/icons/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteAccountCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/account", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        });

        const raw: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            raw &&
            typeof raw === "object" &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : "Não foi possível excluir a conta.";
          throw new Error(message);
        }

        toast.success("Conta excluída", {
          description: "Todos os seus dados foram removidos do Gateon.",
        });
        setOpen(false);
        router.push("/");
        router.refresh();
      } catch (error) {
        toast.error("Falha ao excluir conta", {
          description:
            error instanceof Error
              ? error.message
              : "Tente novamente em instantes.",
        });
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Exclusão de conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            Exclua permanentemente sua conta e todos os dados associados no
            Gateon, incluindo grupos conectados, membros, alertas, integrações
            Stripe e configurações do bot. Esta ação não pode ser desfeita.
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setOpen(true)}
          >
            Excluir conta
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Excluir conta permanentemente?</DialogTitle>
            <DialogDescription>
              Isso remove imediatamente sua conta e todos os dados vinculados:
              grupos Telegram, membros, alertas, templates, conexões Stripe,
              histórico de sincronização e configurações do bot. Você será
              desconectado e não poderá recuperar essas informações depois.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
              loading={isPending}
            >
              {isPending ? (
                <>
                  <LoaderIcon size={14} /> Excluindo…
                </>
              ) : (
                "Sim, excluir tudo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
