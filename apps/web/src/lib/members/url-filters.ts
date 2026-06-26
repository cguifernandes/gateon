import type { DateRangeValue } from "@/components/filters-popever";
import {
  formatUrlDateParam,
  parseUrlDateRange,
  setUrlDateRangeParams,
} from "@/lib/filters/date-params";
import {
  MEMBER_STATUS_FILTER_OPTIONS,
  type MemberStatusFilterValue,
} from "@/lib/members/filter";
import {
  STRIPE_PAYER_FILTER_OPTIONS,
  type StripePayerFilterValue,
} from "@/lib/stripe/payer-filter";

/** Filters persisted in the URL (popover only — search stays in client state). */
export type MembersUrlFiltersState = {
  memberStatus: MemberStatusFilterValue;
  stripePayer: StripePayerFilterValue;
  joinedRange: DateRangeValue;
  leftRange: DateRangeValue;
  telegramChatIds: string[];
};

const VALID_MEMBER_STATUS = new Set<MemberStatusFilterValue>(
  MEMBER_STATUS_FILTER_OPTIONS.map((option) => option.value),
);

const VALID_STRIPE_PAYER = new Set<StripePayerFilterValue>(
  STRIPE_PAYER_FILTER_OPTIONS.map((option) => option.value),
);

export function parseMembersUrlFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get" | "getAll">,
): MembersUrlFiltersState {
  const statusParam = params.get("status") ?? "all";
  const memberStatus: MemberStatusFilterValue = VALID_MEMBER_STATUS.has(
    statusParam as MemberStatusFilterValue,
  )
    ? (statusParam as MemberStatusFilterValue)
    : "all";

  const stripePayerParam = params.get("stripePayer") ?? "all";
  const stripePayer: StripePayerFilterValue = VALID_STRIPE_PAYER.has(
    stripePayerParam as StripePayerFilterValue,
  )
    ? (stripePayerParam as StripePayerFilterValue)
    : "all";

  const telegramChatIds = params
    .getAll("chatId")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id !== "all");

  return {
    memberStatus,
    stripePayer,
    joinedRange: parseUrlDateRange("joinedFrom", "joinedTo", params),
    leftRange: parseUrlDateRange("leftFrom", "leftTo", params),
    telegramChatIds,
  };
}

export function buildMembersUrlFiltersSearchParams(
  filters: MembersUrlFiltersState,
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? "");

  if (filters.memberStatus !== "all") {
    params.set("status", filters.memberStatus);
  } else {
    params.delete("status");
  }

  if (filters.stripePayer !== "all") {
    params.set("stripePayer", filters.stripePayer);
  } else {
    params.delete("stripePayer");
  }

  params.delete("group");
  params.delete("chatId");
  for (const chatId of filters.telegramChatIds) {
    const normalized = chatId.trim();
    if (normalized.length > 0 && normalized !== "all") {
      params.append("chatId", normalized);
    }
  }

  setUrlDateRangeParams(params, "joinedFrom", "joinedTo", filters.joinedRange);
  setUrlDateRangeParams(params, "leftFrom", "leftTo", filters.leftRange);

  return params;
}

export const formatMembersFilterDate = formatUrlDateParam;
