import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { AddGroupBotDialog } from "@/app/(private)/_components/add-group-bot-dialog";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type TelegramGroupSummaryDto,
  telegramGroupsResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import { GroupsTable } from "./_components/groups-table";

export const metadata: Metadata = {
  title: "Grupos — Gateon",
  description: "Gerencie os grupos do Telegram conectados à sua conta.",
};

async function getTelegramGroups(): Promise<{
  groups: TelegramGroupSummaryDto[];
  error: string | null;
}> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return { groups: [], error: "API interna não configurada." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { groups: [], error: "Sessão não encontrada." };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");

  try {
    const response = await fetch(`${base}/telegram/groups`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        groups: [],
        error: "Não foi possível carregar os grupos conectados.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = telegramGroupsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        groups: [],
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return { groups: parsed.data, error: null };
  } catch {
    return {
      groups: [],
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}

export default async function GroupsPage() {
  const { groups, error } = await getTelegramGroups();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-primary text-sm">Telegram</p>
          <h1 className="font-semibold text-2xl text-foreground">
            Grupos conectados
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground text-sm">
            Gerencie todos os grupos do Telegram vinculados ao seu bot.
            Monitore o status, membros e gateways de pagamento conectados.
          </p>
        </div>

        <div className="shrink-0 sm:pt-1">
          <AddGroupBotDialog />
        </div>
      </div>

      {/* Fetch error */}
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : null}

      {/* Main content */}
      {!error ? (
        <GroupsTable
          addGroupButton={<AddGroupBotDialog />}
          groups={groups}
        />
      ) : null}
    </div>
  );
}
