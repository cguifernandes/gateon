import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/server/get-session";

export const metadata: Metadata = {
  title: "Painel — Gateon",
  description: "Gerencie grupos, membros e integrações.",
};

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Olá{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Este é o seu painel. Em breve você poderá conectar grupos e gateways
          por aqui.
        </p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Conta</CardTitle>
          <CardDescription>Dados da sessão atual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium text-foreground">E-mail:</span>{" "}
            <span className="text-muted-foreground">{user?.email}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">
              E-mail verificado:
            </span>{" "}
            <span className="text-muted-foreground">
              {user?.emailVerified ? "Sim" : "Não"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
