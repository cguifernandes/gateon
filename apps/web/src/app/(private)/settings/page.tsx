import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMAIL_SUPPORT } from "@/lib/utils";
import { BotStartSettingsSection } from "./_components/bot-start-settings-section";
import { DeleteAccountCard } from "./_components/delete-account-card";

export const metadata: Metadata = {
  title: "Configurações — Gateon",
  description: "Preferências da conta, privacidade e dados.",
};

export default function DashboardSettingsPage() {
  const exportSubject = encodeURIComponent(
    "Solicitação de exportação de dados",
  );

  return (
    <div className="space-y-6 pb-10">
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
              className={buttonVariants({ variant: "default" })}
            >
              Solicitar exportação
            </a>
          </CardContent>
        </Card>

        <DeleteAccountCard />

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
