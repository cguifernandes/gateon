import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = {
  title: "Entrar — Gateon",
  description: "Acesse sua conta Gateon para gerenciar grupos e assinaturas.",
};

export default async function LoginPage() {
  return (
    <AuthForm
      title="Entrar na conta"
      description="Acesse seu painel para gerenciar grupos, membros e gateways."
      mode="login"
    />
  );
}
