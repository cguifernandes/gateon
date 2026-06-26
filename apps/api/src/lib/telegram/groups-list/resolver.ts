import { buildTelegramGroupMembersWhere } from '../groups-list-filter';
import { buildPaginationMeta, resolvePagination } from '../../query/pagination';
import type { TelegramGroupsListQueryInput } from '../../zod/telegram-groups-list-query-schemas';
import { loadGroupsByIds, resolveFilteredGroupIds } from './query';
import { mapGroupsToResponse } from './mapper';
import { buildGroupsSummary, buildMembersSummary } from './summary';
import type { GroupsListDeps } from './types';

export type { GroupsListDeps } from './types';

export async function resolveTelegramGroupsList(
  deps: GroupsListDeps,
  userId: string,
  query: TelegramGroupsListQueryInput,
  membersView: boolean,
) {
  const { skip, take, page, pageSize } = resolvePagination({
    page: query.page,
    pageSize: query.pageSize,
    all: query.all,
  });

  const filteredIds = await resolveFilteredGroupIds(deps.prisma, userId, query);
  const totalItems = filteredIds.length;
  const pageIds = query.all
    ? filteredIds
    : filteredIds.slice(skip, skip + take);
  const memberWhere = buildTelegramGroupMembersWhere(query);
  const groups = await loadGroupsByIds(
    deps.prisma,
    pageIds,
    membersView,
    Boolean(query.includeMembersPreview),
    memberWhere,
    query,
  );
  const mappedGroups = await mapGroupsToResponse(
    deps,
    userId,
    groups,
    membersView,
    query,
  );

  const [summary, membersSummary] = await Promise.all([
    buildGroupsSummary(deps.prisma, userId, deps.trackedMemberLimitPerGroup),
    membersView
      ? buildMembersSummary(deps.prisma, userId)
      : Promise.resolve(undefined),
  ]);

  return {
    groups: mappedGroups,
    pagination: buildPaginationMeta(page, pageSize, totalItems, query.all),
    summary,
    ...(membersSummary ? { membersSummary } : {}),
  };
}
