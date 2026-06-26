import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderPage } from "@/components/loader-page";
import { getTelegramGroupOptions } from "@/lib/server/data/get-telegram-group-options";
import { getTelegramGroupsForMembers } from "@/lib/server/data/get-telegram-groups-for-members";
import { MEMBERS_TABLE_PAGE_SIZE } from "@/lib/zod/pagination-schemas";
import { MemberSummaryStats } from "./_components/member-summary-stats";
import { MembersTable } from "./_components/table/members-table";

export const metadata: Metadata = {
  title: "Membros — Gateon",
  description: "Gerencie membros rastreados nos grupos conectados.",
};

export default async function MembersPage() {
  const [
    { groups, pagination, membersSummary, summary, error },
    { groups: filterGroups, error: filterGroupsError },
  ] = await Promise.all([
    getTelegramGroupsForMembers({ pageSize: MEMBERS_TABLE_PAGE_SIZE }),
    getTelegramGroupOptions(),
  ]);
  const pageError = error ?? filterGroupsError;

  return (
    <div className="relative flex h-full flex-col gap-6 pb-10">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-extrabold leading-[1.08] tracking-tight text-foreground">
            Membros
          </h1>
          <p className="font-light text-muted-foreground text-sm">
            Visualize membros por grupo e selecione vários perfis para ações de
            gestão.
          </p>
        </div>

        {!error ? <MemberSummaryStats summary={membersSummary} /> : null}
      </div>

      {pageError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {pageError}
        </div>
      ) : (
        <Suspense fallback={<LoaderPage />}>
          <MembersTable
            initialGroups={groups}
            initialPagination={pagination}
            initialMembersSummary={membersSummary}
            filterGroups={filterGroups}
            initialSummary={summary}
          />
        </Suspense>
      )}
    </div>
  );
}
