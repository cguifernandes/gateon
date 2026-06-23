"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  getPaginationPageNumbers,
  type useClientPagination,
} from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";

type PaginationState = Pick<
  ReturnType<typeof useClientPagination<unknown>>,
  | "page"
  | "totalItems"
  | "totalPages"
  | "canGoPrevious"
  | "canGoNext"
  | "rangeStart"
  | "rangeEnd"
  | "showPagination"
> & {
  setPage: (page: number) => void;
  pageSize: number;
};

type DataTablePaginationProps = {
  pagination: PaginationState;
  itemLabel: string;
  itemLabelPlural?: string;
  className?: string;
  summaryClassName?: string;
};

export function DataTablePagination({
  pagination,
  itemLabel,
  itemLabelPlural,
  className,
  summaryClassName,
}: DataTablePaginationProps) {
  const {
    page,
    setPage,
    totalItems,
    totalPages,
    canGoPrevious,
    canGoNext,
    rangeStart,
    rangeEnd,
  } = pagination;

  if (totalItems === 0) {
    return null;
  }

  const pluralLabel = itemLabelPlural ?? `${itemLabel}s`;
  const label = totalItems === 1 ? itemLabel : pluralLabel;
  const pageNumbers = getPaginationPageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 sm:flex-row sm:justify-between",
        className,
      )}
    >
      <p
        className={cn(
          "text-center text-muted-foreground text-xs sm:text-left",
          summaryClassName,
        )}
      >
        Exibindo{" "}
        <strong className="font-medium text-foreground">
          {rangeStart === rangeEnd ? rangeStart : `${rangeStart}–${rangeEnd}`}
        </strong>{" "}
        de <strong className="font-medium text-foreground">{totalItems}</strong>{" "}
        {label}
      </p>

      <Pagination className="mx-0 w-auto justify-center sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={!canGoPrevious}
              onClick={() => setPage(page - 1)}
            />
          </PaginationItem>

          {pageNumbers.map((pageNumber, index) =>
            pageNumber === "ellipsis" ? (
              <PaginationItem
                key={`ellipsis-${String(pageNumbers[index - 1])}-${String(pageNumbers[index + 1])}`}
              >
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  isActive={pageNumber === page}
                  size="icon-sm"
                  className="text-xs"
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              disabled={!canGoNext}
              onClick={() => setPage(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
