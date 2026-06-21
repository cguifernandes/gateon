import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StripeCheckoutCancelPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-2xl">Pagamento cancelado</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Nenhuma cobrança foi feita. Volte ao bot no Telegram para tentar
        novamente.
      </p>
      <Button render={<Link href="/dashboard" />}>Ir para o painel</Button>
    </main>
  );
}
