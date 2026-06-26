import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "../_components/form/reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha — Gateon",
  description: "Defina uma nova senha para sua conta Gateon.",
};

export default function ResetPasswordPage() {
  return (
    <Card className="w-full rounded-3xl border-border bg-card py-0 shadow-xl shadow-primary/10 ring-0">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Redefinir senha
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Escolha uma nova senha. Após confirmar, todas as sessões ativas serão
          encerradas por segurança.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">Carregando…</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
