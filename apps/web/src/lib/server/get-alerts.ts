import { cookies, headers } from "next/headers";
import { buildAlertsListSearchParams } from "@/lib/build-alerts-list-search-params";
import type { AlertsUrlFiltersState } from "@/lib/alerts-url-filters";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type AlertsResponseDto,
  alertsResponseSchema,
} from "@/lib/zod/alert-schemas";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { DEFAULT_PAGE_SIZE } from "@/lib/zod/pagination-schemas";
import { getSessionUser } from "./get-session";

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

type GetAlertsOptions = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  search?: string;
  urlFilters?: AlertsUrlFiltersState;
};

export async function getAlerts(
  options: GetAlertsOptions = {},
): Promise<{
  data: AlertsResponseDto;
  error: string | null;
}> {
  const empty: AlertsResponseDto = {
    alerts: [],
    stats: {
      activeCount: 0,
      sentToday: 0,
      deliveryRate: 0,
      draftCount: 0,
    },
    pagination: EMPTY_PAGINATION,
  };

  const base = getServerApiBaseUrl();
  if (!base) {
    return { data: empty, error: "API interna não configurada." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { data: empty, error: "Sessão não encontrada." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { data: empty, error: "Sessão não encontrada." };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");
  const searchParams = buildAlertsListSearchParams(options);

  try {
    const response = await fetch(`${base}/alerts?${searchParams.toString()}`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        data: empty,
        error: "Não foi possível carregar os alertas.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = alertsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        data: empty,
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return { data: parsed.data, error: null };
  } catch {
    return {
      data: empty,
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}
