"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_COOKIE_NAME = "gateon.privacy-consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function readConsentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  const entry = cookies.find((cookie) =>
    cookie.startsWith(`${CONSENT_COOKIE_NAME}=`),
  );
  return entry ? decodeURIComponent(entry.split("=").slice(1).join("=")) : null;
}

function persistConsent(value: "essential" | "all"): void {
  // biome-ignore lint/suspicious/noDocumentCookie: consent must be readable before hydration across routes
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function PrivacyConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(readConsentCookie() === null);
  }, []);

  if (!isVisible) {
    return null;
  }

  function accept(value: "essential" | "all") {
    persistConsent(value);
    setIsVisible(false);
  }

  return (
    <section
      aria-label="Consentimento de privacidade"
      className="fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-3xl rounded-2xl border border-border bg-secondary p-4 text-card-foreground shadow-2xl sm:left-auto"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Privacidade e cookies</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Usamos cookies essenciais para autenticação, segurança e
            preferências da interface. Cookies opcionais só devem ser ativados
            com seu aceite.
          </p>
          <Link
            href="/privacy"
            className="font-medium text-primary text-sm underline-offset-4 hover:underline"
          >
            Ver política de privacidade
          </Link>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => accept("essential")}
          >
            Apenas essenciais
          </Button>
          <Button type="button" onClick={() => accept("all")}>
            Aceitar todos
          </Button>
        </div>
      </div>
    </section>
  );
}
