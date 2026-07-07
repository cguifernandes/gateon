import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/data/get-session";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = {
  title: "Entrar — Gateon",
  description: "Acesse sua conta Gateon para gerenciar grupos e assinaturas.",
};

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthForm
      title="Entrar na conta"
      description="Acesse seu painel para gerenciar grupos, membros e gateways."
      mode="login"
    />
  );
}
