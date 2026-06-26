import type { MembersUrlFiltersState } from "@/lib/members/url-filters";
import { buildTelegramGroupsListSearchParams } from "@/lib/query/telegram-groups-list-params";
import { telegramGroupsCacheTag } from "@/lib/telegram/cache-tags";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { MEMBERS_TABLE_PAGE_SIZE } from "@/lib/zod/pagination-schemas";
import {
  type TelegramGroupSummaryDto,
  type TelegramGroupsListSummaryDto,
  type TelegramMembersListSummaryDto,
  telegramGroupsPaginatedResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import {
  fetchAuthenticatedUpstreamJson,
  resolveUpstreamSession,
} from "../fetch/authenticated-upstream";

const EMPTY_GROUPS_SUMMARY: TelegramGroupsListSummaryDto = {
  totalGroups: 0,
  pendingPermissionsCount: 0,
  planMemberUsagePercent: 0,
};

const EMPTY_MEMBERS_SUMMARY: TelegramMembersListSummaryDto = {
  totalMembers: 0,
  activeCount: 0,
  leftCount: 0,
};

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: MEMBERS_TABLE_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

type GetTelegramGroupsForMembersOptions = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  includeMemberStripePlans?: boolean;
  search?: string;
  urlFilters?: MembersUrlFiltersState;
};

function emptyMembersResult(error: string) {
  return {
    groups: [] as TelegramGroupSummaryDto[],
    pagination: EMPTY_PAGINATION,
    summary: EMPTY_GROUPS_SUMMARY,
    membersSummary: EMPTY_MEMBERS_SUMMARY,
    error,
  };
}

export async function getTelegramGroupsForMembers(
  options: GetTelegramGroupsForMembersOptions = {},
): Promise<{
  groups: TelegramGroupSummaryDto[];
  pagination: PaginationMeta;
  summary: TelegramGroupsListSummaryDto;
  membersSummary: TelegramMembersListSummaryDto;
  error: string | null;
}> {
  const session = await resolveUpstreamSession();
  if (!session.ok) {
    return emptyMembersResult(session.error);
  }

  const searchParams = buildTelegramGroupsListSearchParams({
    pageSize: MEMBERS_TABLE_PAGE_SIZE,
    ...options,
    view: "members",
  });

  const result = await fetchAuthenticatedUpstreamJson({
    path: `/telegram/groups?${searchParams.toString()}`,
    schema: telegramGroupsPaginatedResponseSchema,
    httpErrorMessage: "Não foi possível carregar os membros dos grupos.",
    cacheTags: [telegramGroupsCacheTag(session.ctx.userId)],
  });

  if (!result.ok) {
    return emptyMembersResult(result.error);
  }

  return {
    groups: result.data.groups,
    pagination: result.data.pagination,
    summary: result.data.summary,
    membersSummary: result.data.membersSummary ?? EMPTY_MEMBERS_SUMMARY,
    error: null,
  };
}
