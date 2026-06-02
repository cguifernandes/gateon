import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderPage } from "@/components/loader-page";
import { getTelegramGroupsForMembers } from "@/lib/server/get-telegram-groups-for-members";
import { MemberSummaryStats } from "./_components/member-summary-stats";
import { MembersTable } from "./_components/table/members-table";

export const metadata: Metadata = {
  title: "Membros — Gateon",
  description: "Gerencie membros rastreados nos grupos conectados.",
};

export default async function MembersPage() {
  const { groups, error } = await getTelegramGroupsForMembers();

  return (
    <div className="relative flex flex-col gap-6">
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

        {!error ? (
          <MemberSummaryStats
            members={groups.flatMap((group) => group.members)}
          />
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : (
        <Suspense fallback={<LoaderPage />}>
          <MembersTable groups={groups} />
        </Suspense>
      )}
    </div>
  );
}
