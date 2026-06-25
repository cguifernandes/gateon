import { StatCard } from "@/app/(private)/alerts/_components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserProfileDto } from "@/lib/zod/auth-schemas";

type ProfileStatsCardProps = {
  stats: UserProfileDto["stats"];
};

const statItems = [
  {
    key: "telegramGroups",
    title: "Grupos conectados",
    description: "Grupos do Telegram vinculados à sua conta.",
  },
  {
    key: "members",
    title: "Membros rastreados",
    description: "Membros ativos monitorados em todos os grupos.",
  },
  {
    key: "alerts",
    title: "Alertas",
    description: "Automações e avisos configurados na conta.",
  },
  {
    key: "stripeConnections",
    title: "Integrações Stripe",
    description: "Conexões Stripe ativas para billing e checkout.",
  },
] as const;

export function ProfileStatsCard({ stats }: ProfileStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo no Gateon</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 h-full sm:grid-cols-2">
        {statItems.map((item) => (
          <StatCard
            key={item.key}
            title={item.title}
            value={String(stats[item.key])}
            description={item.description}
            className="gap-2 p-4"
            showDescription={false}
          />
        ))}
      </CardContent>
    </Card>
  );
}
