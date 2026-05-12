import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações — Gateon",
  description: "Preferências da conta e do painel.",
};

export default function DashboardSettingsPage() {
  return (
    <div className="space-y-2">
      <h1 className="font-semibold text-2xl tracking-tight">Configurações</h1>
      <p className="text-muted-foreground text-sm">
        Em breve você poderá ajustar notificações, integrações e preferências da
        conta aqui.
      </p>
    </div>
  );
}
