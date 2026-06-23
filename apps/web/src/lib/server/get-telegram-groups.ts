import { cookies, headers } from "next/headers";
import { buildTelegramGroupsListSearchParams } from "@/lib/build-telegram-groups-list-search-params";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import type { GroupsUrlFiltersState } from "@/lib/groups-url-filters";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type TelegramGroupSummaryDto,
  type TelegramGroupsListSummaryDto,
  telegramGroupsPaginatedResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { DEFAULT_PAGE_SIZE } from "@/lib/zod/pagination-schemas";
import { getSessionUser } from "./get-session";

const EMPTY_SUMMARY: TelegramGroupsListSummaryDto = {
  totalGroups: 0,
  pendingPermissionsCount: 0,
  planMemberUsagePercent: 0,
};

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

type GetTelegramGroupsOptions = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  search?: string;
  urlFilters?: GroupsUrlFiltersState;
};

export async function getTelegramGroups(
  options: GetTelegramGroupsOptions = {},
): Promise<{
  groups: TelegramGroupSummaryDto[];
  pagination: PaginationMeta;
  summary: TelegramGroupsListSummaryDto;
  error: string | null;
}> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_SUMMARY,
      error: "API interna não configurada.",
    };
  }

  const user = await getSessionUser();
  if (!user) {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_SUMMARY,
      error: "Sessão não encontrada.",
    };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_SUMMARY,
      error: "Sessão não encontrada.",
    };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");
  const searchParams = buildTelegramGroupsListSearchParams(options);

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
        summary: EMPTY_SUMMARY,
        error: "Não foi possível carregar os grupos conectados.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = telegramGroupsPaginatedResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        groups: [],
        pagination: EMPTY_PAGINATION,
        summary: EMPTY_SUMMARY,
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return {
      groups: parsed.data.groups,
      pagination: parsed.data.pagination,
      summary: parsed.data.summary,
      error: null,
    };
  } catch {
    return {
      groups: [],
      pagination: EMPTY_PAGINATION,
      summary: EMPTY_SUMMARY,
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}
