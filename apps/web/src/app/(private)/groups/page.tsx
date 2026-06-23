import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderPage } from "@/components/loader-page";
import { DEFAULT_PLAN_ID, getMaxGroupsForPlan } from "@/lib/plan-limits";
import { getSessionUser } from "@/lib/server/get-session";
import { getTelegramGroups } from "@/lib/server/get-telegram-groups";
import { cn } from "@/lib/utils";
import { GroupsSummaryStats } from "./_components/groups-summary-stats";
import { SyncGroupLimit } from "./_components/sync-group-limit";
import { GroupsTable } from "./_components/table/groups-table";

export const metadata: Metadata = {
  title: "Grupos — Gateon",
  description: "Gerencie os grupos do Telegram conectados à sua conta.",
};

export default async function GroupsPage() {
  const [sessionUser, { groups, pagination, summary, error }] =
    await Promise.all([getSessionUser(), getTelegramGroups()]);
  const planId = sessionUser?.planId ?? DEFAULT_PLAN_ID;
  const isAtLimit =
    !error && summary.totalGroups >= getMaxGroupsForPlan(planId);

  return (
    <div className="relative flex flex-col gap-6">
      {!error ? <SyncGroupLimit connectedCount={summary.totalGroups} /> : null}

      <div className={cn("flex flex-col gap-3", isAtLimit && "mt-[46px]")}>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-extrabold leading-[1.08] tracking-tight text-foreground">
            Grupos conectados
          </h1>
          <p className="font-light text-muted-foreground text-sm">
            Gerencie todos os grupos conectados ao seu bot.
          </p>
        </div>
        {!error ? <GroupsSummaryStats summary={summary} /> : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : (
        <Suspense fallback={<LoaderPage />}>
          <GroupsTable
            initialGroups={groups}
            initialPagination={pagination}
            initialSummary={summary}
          />
        </Suspense>
      )}
    </div>
  );
}
