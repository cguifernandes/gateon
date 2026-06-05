import { AppNotFound } from "@/components/app-not-found";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <AppNotFound
        variant="home"
        title="Página não encontrada"
        description="O endereço pode estar incorreto ou o recurso foi removido. Verifique o link ou explore as opções abaixo."
        backHref="/"
        backLabel="Ir para o início"
      />
    </div>
  );
}
