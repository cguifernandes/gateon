"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
        <h1 className="font-heading font-semibold text-xl">
          Algo deu errado
        </h1>
        <p className="max-w-md text-center text-muted-foreground text-sm">
          Ocorreu um erro inesperado. Nossa equipe foi notificada
          automaticamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-muted"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
