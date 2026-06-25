import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "../_components/form/forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci a senha — Gateon",
  description: "Recupere o acesso à sua conta Gateon.",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full rounded-3xl border-border bg-card py-0 shadow-xl shadow-primary/10 ring-0">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Esqueceu a senha?
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Informe o e-mail da sua conta. Se existir cadastro com senha, enviaremos
          um link seguro para redefinição.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
