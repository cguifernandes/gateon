import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos — Gateon",
  description: "Termos de uso e políticas do Gateon.",
};

export default function TermsPage() {
  return (
    <div className="space-y-2">
      <h1 className="font-semibold text-2xl tracking-tight">Termos de uso</h1>
      <p className="text-muted-foreground text-sm">
        Em breve você poderá consultar os termos de uso e políticas do serviço
        aqui.
      </p>
    </div>
  );
}
