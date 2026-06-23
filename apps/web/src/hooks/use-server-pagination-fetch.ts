"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { DEFAULT_PAGE_SIZE } from "@/lib/zod/pagination-schemas";

type UseServerPaginationFetchOptions<TResponse> = {
  fetchPage: (page: number, signal?: AbortSignal) => Promise<TResponse | null>;
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
  const [fetchedResetKey, setFetchedResetKey] = useState(resetKey);
  const [error, setError] = useState<string | null>(null);
  const previousResetKeyRef = useRef<string | undefined>(undefined);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isRefreshing = resetKey !== fetchedResetKey || isLoading;

  const loadPage = useCallback(
    async (targetPage: number, requestResetKey: string) => {
      const requestId = ++requestIdRef.current;
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchPage(targetPage, abortController.signal);
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!response) {
          setError("Não foi possível carregar os dados.");
          setFetchedResetKey(requestResetKey);
          return;
        }

        setData(response);
        setPage(targetPage);
        setFetchedResetKey(requestResetKey);
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setError("Não foi possível carregar os dados.");
        setFetchedResetKey(requestResetKey);
      } finally {
        if (requestId === requestIdRef.current) {
          abortControllerRef.current = null;
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
      void loadPage(1, resetKey);
    }
  }, [resetKey, loadPage]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  return {
    data,
    page,
    setPage: (targetPage: number) => loadPage(targetPage, resetKey),
    isLoading,
    isRefreshing,
    error,
    reload: () => loadPage(page, resetKey),
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
