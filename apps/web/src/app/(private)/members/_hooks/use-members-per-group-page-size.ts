"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_MEMBERS_PER_GROUP_PAGE_SIZE,
  type MembersPerGroupPageSize,
} from "@/lib/zod/pagination-schemas";

export function useMembersPerGroupPageSize() {
  const [pageSize, setPageSizeState] = useState<MembersPerGroupPageSize>(
    DEFAULT_MEMBERS_PER_GROUP_PAGE_SIZE,
  );

  const setPageSize = useCallback((next: MembersPerGroupPageSize) => {
    setPageSizeState(next);
  }, []);

  return { pageSize, setPageSize };
}
