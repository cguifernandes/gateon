import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = {
  title: "Registrar — Gateon",
  description: "Crie sua conta Gateon para automatizar o acesso ao seu grupo.",
};

export default function RegisterPage() {
  return (
    <AuthForm
      title="Criar conta"
      description="Comece a automatizar o acesso ao seu grupo em poucos minutos."
      mode="register"
    />
  );
}
