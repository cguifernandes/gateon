"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getPublicTelegramBotUrlFromEnv } from "@/lib/telegram/bot-url";

const REDIRECT_DELAY_MS = 2_000;

export default function StripeCheckoutCancelPage() {
  const telegramBotUrl = getPublicTelegramBotUrlFromEnv();
  const redirectScheduledRef = useRef(false);

  useEffect(() => {
    if (redirectScheduledRef.current) {
      return;
    }
    redirectScheduledRef.current = true;

    const timeoutId = window.setTimeout(() => {
      window.location.assign(telegramBotUrl);
    }, REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [telegramBotUrl]);

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-2xl">Pagamento cancelado</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Nenhuma cobrança foi feita. Você será redirecionado ao bot no Telegram
        para tentar novamente.
      </p>
      <Button
        nativeButton={false}
        render={<a href={telegramBotUrl}>Voltar ao Telegram agora</a>}
      />

      <Button
        nativeButton={false}
        variant="outline"
        render={<Link href="/dashboard">Ir para o painel</Link>}
      />
    </main>
  );
}
