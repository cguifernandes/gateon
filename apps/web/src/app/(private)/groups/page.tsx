import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { removeTelegramGroupAction } from "@/lib/server/remove-telegram-group.action";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type TelegramGroupSummaryDto,
  telegramGroupsResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";

export const metadata: Metadata = {
  title: "Grupos — Gateon",
  description: "Lista simples dos grupos conectados para testes.",
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
      return { groups: [], error: "A resposta da API veio em formato inválido." };
    }

    return { groups: parsed.data, error: null };
  } catch {
    return { groups: [], error: "A API demorou para responder. Tente novamente." };
  }
}

function formatTelegramMemberName(
  member: TelegramGroupSummaryDto["connectedBy"],
) {
  if (!member) {
    return "Não identificado";
  }

  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  if (fullName) {
    return fullName;
  }

  return member.username ? `@${member.username}` : member.telegramUserId;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function GroupsPage() {
  const { groups, error } = await getTelegramGroups();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-medium text-primary text-sm">Teste Telegram</p>
        <h1 className="font-semibold text-2xl text-foreground">
          Grupos conectados
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
          Página simples para conferir os grupos salvos, a contagem atual de
          membros e o usuário Telegram que fez a conexão.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : null}

      {!error && groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <h2 className="font-medium text-foreground">Nenhum grupo conectado</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Conecte um grupo pelo botão de cadastro para ele aparecer aqui.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4">
        {groups.map((group) => (
          <article
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
            key={group.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-foreground text-lg">
                  {group.title || "Grupo sem nome"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Telegram ID:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {group.telegramChatId}
                  </code>
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="rounded-lg bg-primary/10 px-3 py-2 text-primary">
                  <p className="font-semibold text-xl">
                    {group.memberCount ?? "--"}
                  </p>
                  <p className="text-xs">
                    {group.memberCount === null
                      ? "membros indisponível"
                      : "membros"}
                  </p>
                </div>
                <form action={removeTelegramGroupAction}>
                  <input name="groupId" type="hidden" value={group.id} />
                  <button
                    className="rounded-lg border border-destructive/30 px-3 py-1.5 font-medium text-destructive text-xs transition-colors hover:bg-destructive/10"
                    type="submit"
                  >
                    Remover conexão
                  </button>
                </form>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium text-foreground">{group.type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status do bot</dt>
                <dd className="font-medium text-foreground">
                  {group.botStatus}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Conectado em</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(group.connectedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Atualizado em</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(group.updatedAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
              <p className="text-muted-foreground">Membro que conectou</p>
              <p className="font-medium text-foreground">
                {formatTelegramMemberName(group.connectedBy)}
              </p>
              {group.connectedBy ? (
                <p className="mt-1 text-muted-foreground text-xs">
                  Telegram user ID: {group.connectedBy.telegramUserId}
                  {group.connectedBy.username
                    ? ` · @${group.connectedBy.username}`
                    : ""}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
