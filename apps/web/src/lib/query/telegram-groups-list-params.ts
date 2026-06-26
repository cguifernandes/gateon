import { formatUrlDateParam } from "@/lib/filters/date-params";
import type { GroupsUrlFiltersState } from "@/lib/groups/url-filters";
import type { MembersUrlFiltersState } from "@/lib/members/url-filters";
import {
  DEFAULT_MEMBERS_PER_GROUP_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} from "@/lib/zod/pagination-schemas";

type BuildGroupsListParamsInput = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  view?: "members";
  membersPerGroupPageSize?: number;
  membersPages?: Record<string, number>;
  includeMembersPreview?: boolean;
  includeTelegramMemberCount?: boolean;
  includeMemberStripePlans?: boolean;
  search?: string;
  urlFilters?: GroupsUrlFiltersState | MembersUrlFiltersState;
};

function appendDateRange(
  params: URLSearchParams,
  prefix: "joined" | "left" | "",
  range?: { from?: Date; to?: Date },
) {
  if (!range?.from) {
    return;
  }

  const fromKey = prefix ? `${prefix}From` : "from";
  const toKey = prefix ? `${prefix}To` : "to";
  params.set(fromKey, formatUrlDateParam(range.from));
  if (range.to) {
    params.set(toKey, formatUrlDateParam(range.to));
  }
}

export function buildTelegramGroupsListSearchParams(
  input: BuildGroupsListParamsInput,
): URLSearchParams {
  const params = new URLSearchParams();

  if (input.all) {
    params.set("all", "true");
  } else {
    params.set("page", String(input.page ?? 1));
    params.set("pageSize", String(input.pageSize ?? DEFAULT_PAGE_SIZE));
  }

  if (input.view === "members") {
    params.set("view", "members");
    params.set(
      "membersPerGroupPageSize",
      String(
        input.membersPerGroupPageSize ?? DEFAULT_MEMBERS_PER_GROUP_PAGE_SIZE,
      ),
    );

    const membersPages = input.membersPages;
    if (membersPages && Object.keys(membersPages).length > 0) {
      params.set(
        "membersPages",
        Object.entries(membersPages)
          .map(([groupId, page]) => `${groupId}:${page}`)
          .join(","),
      );
    }
  }
  if (input.includeMembersPreview) {
    params.set("includeMembersPreview", "true");
  }
  if (input.includeTelegramMemberCount) {
    params.set("includeTelegramMemberCount", "true");
  }
  if (input.includeMemberStripePlans === false) {
    params.set("includeMemberStripePlans", "false");
  }

  const search = input.search?.trim();
  if (search) {
    params.set("q", search);
  }

  const filters = input.urlFilters;
  if (!filters) {
    return params;
  }

  if ("botStatus" in filters) {
    if (filters.botStatus !== "all") {
      params.set("status", filters.botStatus);
    }
    appendDateRange(params, "", filters.connectedRange);
    if (filters.stripeConnectionIds.length > 0) {
      params.set("stripeConnectionIds", filters.stripeConnectionIds.join(","));
    }
    return params;
  }

  if (filters.memberStatus !== "all") {
    params.set("memberStatus", filters.memberStatus);
  }

  if (filters.stripePayer !== "all") {
    params.set("stripePayer", filters.stripePayer);
  }

  appendDateRange(params, "joined", filters.joinedRange);
  appendDateRange(params, "left", filters.leftRange);

  if (filters.telegramChatIds.length > 0) {
    params.set("telegramChatIds", filters.telegramChatIds.join(","));
  }

  return params;
}
