"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type GroupMembersPaginationProps = {
  group: TelegramGroupSummaryDto;
  onPageChange: (groupId: string, page: number) => void;
  disabled?: boolean;
};

export function GroupMembersPagination({
  group,
  onPageChange,
  disabled = false,
}: GroupMembersPaginationProps) {
  const pagination = group.membersPagination;
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const start =
    pagination.totalItems === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(
    pagination.page * pagination.pageSize,
    pagination.totalItems,
  );

  return (
    <TableRow className="hover:bg-background!">
      <TableCell colSpan={6} className="p-0 hover:bg-transparent!">
        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Mostrando {start}–{end} de {pagination.totalItems} membros neste
            grupo
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={disabled || !pagination.hasPreviousPage}
              onClick={() => onPageChange(group.id, pagination.page - 1)}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={disabled || !pagination.hasNextPage}
              onClick={() => onPageChange(group.id, pagination.page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
