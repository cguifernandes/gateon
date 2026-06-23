"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { DEFAULT_PAGE_SIZE } from "@/lib/zod/pagination-schemas";

type UseServerPaginationFetchOptions<TResponse> = {
  fetchPage: (page: number) => Promise<TResponse | null>;
  resetKey: string;
  initialData?: TResponse | null;
  initialPage?: number;
};

export function useServerPaginationFetch<TResponse>({
  fetchPage,
  resetKey,
  initialData = null,
  initialPage = 1,
}: UseServerPaginationFetchOptions<TResponse>) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<TResponse | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousResetKeyRef = useRef<string | undefined>(undefined);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async (targetPage: number) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchPage(targetPage);
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!response) {
          setError("Não foi possível carregar os dados.");
          return;
        }

        setData(response);
        setPage(targetPage);
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setError("Não foi possível carregar os dados.");
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    if (previousResetKeyRef.current === undefined) {
      previousResetKeyRef.current = resetKey;
      return;
    }

    if (previousResetKeyRef.current !== resetKey) {
      previousResetKeyRef.current = resetKey;
      void loadPage(1);
    }
  }, [resetKey, loadPage]);

  return {
    data,
    page,
    setPage: (nextPage: number) => {
      void loadPage(nextPage);
    },
    isLoading,
    error,
    reload: () => {
      void loadPage(page);
    },
  };
}

export function toClientPaginationState(
  pagination: PaginationMeta,
  setPage: (page: number) => void,
) {
  const rangeStart =
    pagination.totalItems === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.pageSize,
    pagination.totalItems,
  );

  return {
    page: pagination.page,
    setPage,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    totalPages: pagination.totalPages,
    canGoPrevious: pagination.page > 1,
    canGoNext: pagination.page < pagination.totalPages,
    rangeStart,
    rangeEnd,
    showPagination: pagination.totalPages > 1,
  };
}

export { DEFAULT_PAGE_SIZE };
