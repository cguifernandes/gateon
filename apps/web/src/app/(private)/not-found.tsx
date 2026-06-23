import { AppNotFound } from "@/components/app-not-found";
import { getAlerts } from "@/lib/server/get-alerts";
import { getTelegramGroupOptions } from "@/lib/server/get-telegram-group-options";

export default async function PrivateNotFound() {
  const [{ groups }, { data: alertsData }] = await Promise.all([
    getTelegramGroupOptions(),
    getAlerts({ pageSize: 3 }),
  ]);

  return (
    <div className="flex flex-1 flex-col py-8 md:py-12">
      <AppNotFound
        title="Página não encontrada"
        description="O endereço pode estar incorreto ou o recurso foi removido. Volte ao dashboard para continuar navegando."
        backHref="/dashboard"
        backLabel="Voltar para o dashboard"
        suggestedGroups={groups}
        suggestedAlerts={alertsData.alerts}
      />
    </div>
  );
}
