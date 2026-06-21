import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMAIL_SUPPORT } from "@/lib/utils";
import { BotStartSettingsSection } from "./_components/bot-start-settings-section";

export const metadata: Metadata = {
  title: "Configurações — Gateon",
  description: "Preferências da conta, privacidade e dados.",
};

export default function DashboardSettingsPage() {
  const exportSubject = encodeURIComponent(
    "Solicitação de exportação de dados",
  );
  const deletionSubject = encodeURIComponent(
    "Solicitação de exclusão de conta",
  );

  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Configurações</h1>
        <p className="text-muted-foreground font-light text-sm">
          Gerencie preferências da conta, privacidade e solicitações
          relacionadas aos seus dados.
        </p>
      </div>

      <BotStartSettingsSection />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Central de dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Solicite uma cópia dos dados da sua conta, grupos conectados,
              membros registrados e configurações operacionais mantidas pelo
              Gateon.
            </p>
            <a
              href={`mailto:${EMAIL_SUPPORT}?subject=${exportSubject}`}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm hover:bg-primary/80"
            >
              Solicitar exportação
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exclusão de conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Peça a exclusão da conta e dos dados associados. A remoção pode
              exigir confirmação de identidade e não substitui obrigações legais
              de retenção mínima quando aplicáveis.
            </p>
            <a
              href={`mailto:${EMAIL_SUPPORT}?subject=${deletionSubject}`}
              className="inline-flex h-9 items-center rounded-md border border-destructive/30 bg-destructive/10 px-3 font-medium text-destructive text-sm hover:bg-destructive/20"
            >
              Solicitar exclusão
            </a>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Privacidade e termos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm sm:flex-row">
            <Link
              href="/privacy"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Política de privacidade
            </Link>
            <Link
              href="/terms"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Termos de uso
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
