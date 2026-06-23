"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

type UseClientPaginationOptions = {
  pageSize?: number;
  /** Serialized key — when it changes, the current page resets to 1. */
  resetKey?: string;
};

export function useClientPagination<T>(
  items: readonly T[],
  options: UseClientPaginationOptions = {},
) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const resetKey = options.resetKey ?? "";
  const [page, setPage] = useState(1);
  const previousResetKeyRef = useRef<string | undefined>(undefined);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (previousResetKeyRef.current === undefined) {
      previousResetKeyRef.current = resetKey;
      return;
    }

    if (previousResetKeyRef.current !== resetKey) {
      previousResetKeyRef.current = resetKey;
      setPage(1);
    }
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => {
      const clamped = Math.min(Math.max(1, current), totalPages);
      return clamped === current ? current : clamped;
    });
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);

  return {
    page: safePage,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    canGoPrevious: safePage > 1,
    canGoNext: safePage < totalPages,
    rangeStart,
    rangeEnd,
    showPagination: totalPages > 1,
  };
}

export function getPaginationPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];

    if (previous !== undefined && page - previous > 1) {
      result.push("ellipsis");
    }

    result.push(page);
  }

  return result;
}
