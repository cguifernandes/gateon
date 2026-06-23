import { cookies, headers } from "next/headers";
import { buildTelegramGroupsListSearchParams } from "@/lib/build-telegram-groups-list-search-params";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import type { MembersUrlFiltersState } from "@/lib/members-url-filters";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type TelegramGroupSummaryDto,
  type TelegramGroupsListSummaryDto,
  type TelegramMembersListSummaryDto,
  telegramGroupsPaginatedResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { MEMBERS_TABLE_PAGE_SIZE } from "@/lib/zod/pagination-schemas";
import { getSessionUser } from "./get-session";

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

export async function getTelegramGroupsForMembers(
  options: GetTelegramGroupsForMembersOptions = {},
): Promise<{
  groups: TelegramGroupSummaryDto[];
  pagination: PaginationMeta;
  summary: TelegramGroupsListSummaryDto;
  membersSummary: TelegramMembersListSummaryDto;
  error: string | null;
}> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_GROUPS_SUMMARY,
      membersSummary: EMPTY_MEMBERS_SUMMARY,
      error: "API interna não configurada.",
    };
  }

  const user = await getSessionUser();
  if (!user) {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_GROUPS_SUMMARY,
      membersSummary: EMPTY_MEMBERS_SUMMARY,
      error: "Sessão não encontrada.",
    };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_GROUPS_SUMMARY,
      membersSummary: EMPTY_MEMBERS_SUMMARY,
      error: "Sessão não encontrada.",
    };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");
  const searchParams = buildTelegramGroupsListSearchParams({
    pageSize: MEMBERS_TABLE_PAGE_SIZE,
    ...options,
    view: "members",
  });

  try {
    const response = await fetch(
      `${base}/telegram/groups?${searchParams.toString()}`,
      {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        },
        next: { tags: [telegramGroupsCacheTag(user.id)] },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      return {
        groups: [],
        pagination: EMPTY_PAGINATION,
        summary: EMPTY_GROUPS_SUMMARY,
        membersSummary: EMPTY_MEMBERS_SUMMARY,
        error: "Não foi possível carregar os membros dos grupos.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = telegramGroupsPaginatedResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        groups: [],
        pagination: EMPTY_PAGINATION,
        summary: EMPTY_GROUPS_SUMMARY,
        membersSummary: EMPTY_MEMBERS_SUMMARY,
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return {
      groups: parsed.data.groups,
      pagination: parsed.data.pagination,
      summary: parsed.data.summary,
      membersSummary:
        parsed.data.membersSummary ?? EMPTY_MEMBERS_SUMMARY,
      error: null,
    };
  } catch {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_GROUPS_SUMMARY,
      membersSummary: EMPTY_MEMBERS_SUMMARY,
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}
