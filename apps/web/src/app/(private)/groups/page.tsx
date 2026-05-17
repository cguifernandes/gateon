import type { Metadata } from "next";
import { AddGroupBotDialog } from "@/components/add-group-bot-dialog";
import { getTelegramGroups } from "@/lib/server/get-telegram-groups";
import { cn } from "@/lib/utils";
import { GroupsTable } from "./_components/groups-table";
import { LimitGroups } from "./_components/limit-groups";
import { SyncGroupLimit } from "./_components/sync-group-limit";

export const metadata: Metadata = {
  title: "Grupos — Gateon",
  description: "Gerencie os grupos do Telegram conectados à sua conta.",
};

export default async function GroupsPage() {
  const { groups, error } = await getTelegramGroups();

  return (
    <>
      {!error ? <SyncGroupLimit connectedCount={groups.length} /> : null}

      <LimitGroups />

      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          "mt-[46px]",
        )}
      >
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-extrabold leading-[1.08] tracking-tight text-foreground">
            Grupos conectados
          </h1>
          <p className="font-light text-muted-foreground text-sm">
            Gerencie todos os grupos do Telegram vinculados ao seu bot. Monitore
            o status, membros e gateways de pagamento conectados.
          </p>
        </div>

        <AddGroupBotDialog />
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : (
        <GroupsTable groups={groups} />
      )}
    </>
  );
}
