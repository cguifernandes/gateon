"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getPublicTelegramBotUrlFromEnv } from "@/lib/telegram-bot-url";

const REDIRECT_DELAY_MS = 1_500;

type CheckoutFinalizeResponse = {
  success?: boolean;
  telegramBotUrl?: string;
};

function redirectToTelegram(botUrl: string) {
  window.location.assign(botUrl);
}

function StripeCheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [telegramBotUrl, setTelegramBotUrl] = useState(
    getPublicTelegramBotUrlFromEnv(),
  );
  const redirectScheduledRef = useRef(false);

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
      .then(async (response) => {
        if (!response.ok) {
          setStatus("error");
          return;
        }

        const data = (await response.json()) as CheckoutFinalizeResponse;
        const botUrl =
          typeof data.telegramBotUrl === "string" &&
          data.telegramBotUrl.trim().length > 0
            ? data.telegramBotUrl.trim()
            : getPublicTelegramBotUrlFromEnv();
        setTelegramBotUrl(botUrl);
        setStatus("success");

        if (redirectScheduledRef.current) {
          return;
        }
        redirectScheduledRef.current = true;
        window.setTimeout(() => {
          redirectToTelegram(botUrl);
        }, REDIRECT_DELAY_MS);
      })
      .catch(() => {
        setStatus("error");
      });
  }, [sessionId]);

  return (
    <>
      {status === "loading" ? (
        <p className="text-muted-foreground text-sm">
          Confirmando pagamento...
        </p>
      ) : null}
      {status === "success" ? (
        <>
          <h1 className="font-semibold text-2xl">Pagamento confirmado</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Abrindo o Telegram… O bot enviará o link de acesso ao grupo no
            privado em instantes.
          </p>
          <Button
            render={<a href={telegramBotUrl}>Abrir o Telegram agora</a>}
          />
        </>
      ) : null}
      {status === "error" ? (
        <>
          <h1 className="font-semibold text-2xl">Não foi possível confirmar</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Se o pagamento foi aprovado, abra o bot no Telegram. O acesso pode
            levar alguns minutos para ser liberado.
          </p>
          <Button
            render={<a href={telegramBotUrl}>Abrir o bot no Telegram</a>}
          />
        </>
      ) : null}
      <Button variant="outline" render={<Link href="/dashboard" />}>
        Ir para o painel
      </Button>
    </>
  );
}

export default function StripeCheckoutSuccessPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <Suspense
        fallback={
          <p className="text-muted-foreground text-sm">
            Confirmando pagamento...
          </p>
        }
      >
        <StripeCheckoutSuccessContent />
      </Suspense>
    </main>
  );
}
