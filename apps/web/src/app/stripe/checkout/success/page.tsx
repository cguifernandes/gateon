"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function StripeCheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    void fetch("/api/stripe-billing/checkout/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((response) => {
        setStatus(response.ok ? "success" : "error");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [sessionId]);

  return (
    <>
      {status === "loading" ? (
        <p className="text-muted-foreground text-sm">Confirmando pagamento...</p>
      ) : null}
      {status === "success" ? (
        <>
          <h1 className="font-semibold text-2xl">Pagamento confirmado</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Volte ao Telegram. O bot enviará o link de acesso ao grupo no chat
            privado em instantes.
          </p>
        </>
      ) : null}
      {status === "error" ? (
        <>
          <h1 className="font-semibold text-2xl">Não foi possível confirmar</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Se o pagamento foi aprovado, aguarde alguns minutos e abra o bot no
            Telegram novamente.
          </p>
        </>
      ) : null}
      <Button render={<Link href="/dashboard" />}>Ir para o painel</Button>
    </>
  );
}

export default function StripeCheckoutSuccessPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <Suspense
        fallback={
          <p className="text-muted-foreground text-sm">Confirmando pagamento...</p>
        }
      >
        <StripeCheckoutSuccessContent />
      </Suspense>
    </main>
  );
}
