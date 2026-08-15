import type { Metadata } from "next";
import { DEFAULT_PLAN_ID, getMaxGroupsForPlan } from "@/lib/plan/limits";
import { getSessionUser } from "@/lib/server/data/get-session";
import { getStripeBillingConnectionOptions } from "@/lib/server/data/get-stripe-billing-connection-options";
import { getTelegramGroups } from "@/lib/server/data/get-telegram-groups";
import { cn } from "@/lib/utils";
import { GroupsSummaryStats } from "./_components/groups-summary-stats";
import { SyncGroupLimit } from "./_components/sync-group-limit";
import { GroupsTable } from "./_components/table/groups-table";

export const metadata: Metadata = {
  title: "Grupos — Gateon",
  description: "Gerencie os grupos do Telegram conectados à sua conta.",
};

export default async function GroupsPage() {
  const [sessionUser, { groups, pagination, summary, error }, { connections }] =
    await Promise.all([
      getSessionUser(),
      getTelegramGroups(),
      getStripeBillingConnectionOptions(),
    ]);
  const planId = sessionUser?.planId ?? DEFAULT_PLAN_ID;
  const isAtLimit =
    !error && summary.totalGroups >= getMaxGroupsForPlan(planId);

  return (
    <div className="relative flex flex-col gap-6 pt-4 pb-10">
      {!error ? <SyncGroupLimit connectedCount={summary.totalGroups} /> : null}

      <div className={cn("flex flex-col gap-3", isAtLimit && "mt-[46px]")}>
        <h1 className="font-heading text-2xl font-semibold leading-[1.08] tracking-tight text-foreground">
          Grupos
        </h1>
        {!error ? <GroupsSummaryStats summary={summary} /> : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : (
        <GroupsTable
          initialGroups={groups}
          initialPagination={pagination}
          initialSummary={summary}
          stripeConnections={connections}
        />
      )}
    </div>
  );
}
