import { AppNotFound } from "@/components/app-not-found";

export default function PrivateNotFound() {
  return (
    <div className="flex flex-1 flex-col py-8 md:py-12">
      <AppNotFound
        title="Página não encontrada"
        description="O endereço pode estar incorreto ou o recurso foi removido. Volte ao dashboard para continuar navegando."
        backHref="/dashboard"
        backLabel="Voltar para o dashboard"
        suggestedGroups={[]}
        suggestedAlerts={[]}
      />
    </div>
  );
}
