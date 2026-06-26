import type { GroupsUrlFiltersState } from "@/lib/groups/url-filters";
import { buildTelegramGroupsListSearchParams } from "@/lib/query/telegram-groups-list-params";
import { telegramGroupsCacheTag } from "@/lib/telegram/cache-tags";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { GROUPS_TABLE_PAGE_SIZE } from "@/lib/zod/pagination-schemas";
import {
  type TelegramGroupSummaryDto,
  type TelegramGroupsListSummaryDto,
  telegramGroupsPaginatedResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import {
  fetchAuthenticatedUpstreamJson,
  resolveUpstreamSession,
} from "../fetch/authenticated-upstream";

const EMPTY_SUMMARY: TelegramGroupsListSummaryDto = {
  totalGroups: 0,
  pendingPermissionsCount: 0,
  planMemberUsagePercent: 0,
};

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: GROUPS_TABLE_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

type GetTelegramGroupsOptions = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  includeMembersPreview?: boolean;
  includeTelegramMemberCount?: boolean;
  includeMemberStripePlans?: boolean;
  search?: string;
  urlFilters?: GroupsUrlFiltersState;
};

function emptyGroupsResult(error: string) {
  return {
    groups: [] as TelegramGroupSummaryDto[],
    pagination: EMPTY_PAGINATION,
    summary: EMPTY_SUMMARY,
    error,
  };
}

export async function getTelegramGroups(
  options: GetTelegramGroupsOptions = {},
): Promise<{
  groups: TelegramGroupSummaryDto[];
  pagination: PaginationMeta;
  summary: TelegramGroupsListSummaryDto;
  error: string | null;
}> {
  const session = await resolveUpstreamSession();
  if (!session.ok) {
    return emptyGroupsResult(session.error);
  }

  const searchParams = buildTelegramGroupsListSearchParams({
    pageSize: GROUPS_TABLE_PAGE_SIZE,
    ...options,
  });

  const result = await fetchAuthenticatedUpstreamJson({
    path: `/telegram/groups?${searchParams.toString()}`,
    schema: telegramGroupsPaginatedResponseSchema,
    httpErrorMessage: "Não foi possível carregar os grupos conectados.",
    cacheTags: [telegramGroupsCacheTag(session.ctx.userId)],
  });

  if (!result.ok) {
    return emptyGroupsResult(result.error);
  }

  return {
    groups: result.data.groups,
    pagination: result.data.pagination,
    summary: result.data.summary,
    error: null,
  };
}
