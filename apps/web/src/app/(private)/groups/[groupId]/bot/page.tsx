import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTelegramGroupById } from "@/lib/server/get-telegram-group-by-id";
import { BotConfigForm } from "./_components/bot-config-form";

type BotConfigPageProps = {
  params: Promise<{ groupId: string }>;
};

export async function generateMetadata({
  params,
}: BotConfigPageProps): Promise<Metadata> {
  const { groupId } = await params;
  const { group } = await getTelegramGroupById(groupId);
  const groupName = group?.title?.trim() || "Grupo sem nome";

  return {
    title: `${groupName} — Configuração do Bot — Gateon`,
    description: `Configure o comportamento do bot no grupo ${groupName}.`,
  };
}

export default async function BotConfigPage({ params }: BotConfigPageProps) {
  const { groupId } = await params;
  const { group, error } = await getTelegramGroupById(groupId);

  if (!group) {
    return (
      <div className="relative flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-8 text-center">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Configuração indisponível
          </h1>
          <p className="max-w-md text-muted-foreground text-sm">
            {error ?? "Não encontramos este grupo conectado à sua conta."}
          </p>
        </div>
        <Link href="/groups" className={buttonVariants({ variant: "outline" })}>
          Voltar para grupos
        </Link>
      </div>
    );
  }

  return <BotConfigForm group={group} />;
}
