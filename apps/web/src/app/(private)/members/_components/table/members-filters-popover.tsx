"use client";

import { useMemo } from "react";
import { type FilterParam, FiltersPopover } from "@/components/filters-popever";
import {
  MEMBER_STATUS_FILTER_OPTIONS,
  type MemberStatusFilterValue,
} from "@/lib/members/filter";
import {
  STRIPE_PAYER_FILTER_OPTIONS,
  type StripePayerFilterValue,
} from "@/lib/stripe/payer-filter";
import {
  MEMBERS_PER_GROUP_PAGE_SIZE_OPTIONS,
  type MembersPerGroupPageSize,
} from "@/lib/zod/pagination-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import type { MembersFiltersPopoverControl } from "../../_hooks/use-members-filters-url";
import { MembersGroupFilterOptions } from "./members-group-filter-options";

const MEMBERS_PER_GROUP_PAGE_SIZE_FILTER_OPTIONS =
  MEMBERS_PER_GROUP_PAGE_SIZE_OPTIONS.map((size) => ({
    value: String(size),
    label: `${size} / grupo`,
  }));

type MembersFiltersPopoverProps = {
  groups: TelegramGroupSummaryDto[];
  control: MembersFiltersPopoverControl;
};

export function MembersFiltersPopover({
  groups,
  control,
}: MembersFiltersPopoverProps) {
  const { draft } = control;

  const filters = useMemo<FilterParam[]>(
    () => [
      {
        type: "select",
        field: "membersPerGroupPageSize",
        label: "Membros visíveis por grupo",
        value: String(control.draftMembersPerGroupPageSize),
        options: MEMBERS_PER_GROUP_PAGE_SIZE_FILTER_OPTIONS,
        onChange: (value) =>
          control.setMembersPerGroupPageSize(
            Number(value) as MembersPerGroupPageSize,
          ),
      },
      {
        type: "select",
        field: "memberStatus",
        label: "Status do membro",
        value: draft.memberStatus,
        emptyValue: "all",
        options: MEMBER_STATUS_FILTER_OPTIONS,
        onChange: (value) =>
          control.setMemberStatus(value as MemberStatusFilterValue),
      },
      {
        type: "select",
        field: "stripePayer",
        label: "Pagamento Stripe",
        value: draft.stripePayer,
        emptyValue: "all",
        options: STRIPE_PAYER_FILTER_OPTIONS,
        onChange: (value) =>
          control.setStripePayer(value as StripePayerFilterValue),
      },
      {
        type: "custom",
        field: "telegramChatId",
        label: "Grupo",
        isActive: draft.telegramChatIds.length > 0,
        render: (
          <MembersGroupFilterOptions
            groups={groups}
            value={draft.telegramChatIds}
            onChange={control.setTelegramChatIds}
          />
        ),
      },
      {
        type: "date",
        field: "joinedAt",
        label: "Entrada entre",
        range: true,
        value: draft.joinedRange,
        onChange: control.setJoinedRange,
      },
      {
        type: "date",
        field: "leftAt",
        label: "Saída entre",
        range: true,
        value: draft.leftRange,
        onChange: control.setLeftRange,
      },
    ],
    [draft, groups, control],
  );

  return (
    <FiltersPopover
      title="Filtros avançados de membros"
      filters={filters}
      appliedActiveFilterCount={control.appliedActiveCount}
      hasPendingChanges={control.hasPendingChanges}
      onApplyFilters={control.apply}
      onClearFilters={control.clear}
      onPopoverOpenChange={(open) => {
        if (open) {
          control.syncDraftFromUrl();
        }
      }}
    />
  );
}
