import type { DateRangeValue } from "@/components/filters-popever";
import {
  MEMBER_STATUS_FILTER_OPTIONS,
  type MemberStatusFilterValue,
} from "@/lib/members-filter";
import {
  STRIPE_PAYER_FILTER_OPTIONS,
  type StripePayerFilterValue,
} from "@/lib/stripe-payer-filter";

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

const DATE_PARAM_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParam(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const match = DATE_PARAM_RE.exec(value);
  if (!match) {
    return undefined;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatMembersFilterDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateRange(
  fromKey: string,
  toKey: string,
  params: Pick<URLSearchParams, "get">,
): DateRangeValue {
  const from = parseDateParam(params.get(fromKey));
  const to = parseDateParam(params.get(toKey));

  return from !== undefined ? { from, to } : undefined;
}

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
    joinedRange: parseDateRange("joinedFrom", "joinedTo", params),
    leftRange: parseDateRange("leftFrom", "leftTo", params),
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

  if (filters.joinedRange?.from) {
    params.set("joinedFrom", formatMembersFilterDate(filters.joinedRange.from));
    if (filters.joinedRange.to) {
      params.set("joinedTo", formatMembersFilterDate(filters.joinedRange.to));
    } else {
      params.delete("joinedTo");
    }
  } else {
    params.delete("joinedFrom");
    params.delete("joinedTo");
  }

  if (filters.leftRange?.from) {
    params.set("leftFrom", formatMembersFilterDate(filters.leftRange.from));
    if (filters.leftRange.to) {
      params.set("leftTo", formatMembersFilterDate(filters.leftRange.to));
    } else {
      params.delete("leftTo");
    }
  } else {
    params.delete("leftFrom");
    params.delete("leftTo");
  }

  return params;
}
