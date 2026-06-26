import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBotStartSettings } from "@/lib/server/data/get-bot-start-settings";
import { getTelegramGroupById } from "@/lib/server/data/get-telegram-group-by-id";
import { BotConfigForm } from "./_components/bot-config-form";

type BotConfigPageProps = {
  params: Promise<{ groupId: string }>;
};

export async function generateMetadata({
  params,
}: BotConfigPageProps): Promise<Metadata> {
  const { groupId } = await params;
  const { group } = await getTelegramGroupById(groupId);

  if (!group) {
    return { title: "Não encontrado — Gateon" };
  }

  const groupName = group.title?.trim() || "Grupo sem nome";

  return {
    title: `${groupName} — Configuração do Bot — Gateon`,
    description: `Configure o comportamento do bot no grupo ${groupName}.`,
  };
}

export default async function BotConfigPage({ params }: BotConfigPageProps) {
  const { groupId } = await params;
  const [{ group }, userSettings] = await Promise.all([
    getTelegramGroupById(groupId),
    getBotStartSettings(),
  ]);

  if (!group) {
    notFound();
  }

  return <BotConfigForm group={group} automationSettings={userSettings.data} />;
}
