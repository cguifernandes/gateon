"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  type TelegramGroupMemberBulkActionResultDto,
  telegramGroupMemberBulkActionResultSchema,
} from "@/lib/zod/telegram-group-connection-schemas";

export const DEFAULT_MEMBER_NOTICE_TEXT = "Boa tarde";

export type MemberBulkAction = "notice" | "remove" | "ban";

export type MemberActionTarget = {
  groupId: string;
  telegramUserId?: string;
  selectAllInGroup?: boolean;
  status?: "active" | "left";
  isOwner?: boolean;
};

const BULK_ACTION_REQUEST_CHUNK_SIZE = 100;

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export type MemberActionAggregate = {
  successCount: number;
  failedCount: number;
  failures: TelegramGroupMemberBulkActionResultDto["failures"];
};

/** Labels shown in bulk toolbar buttons. */
export const MEMBER_ACTION_UI_LABELS: Record<MemberBulkAction, string> = {
  notice: "Enviar aviso",
  remove: "Remover do grupo",
  ban: "Banir usuário",
};

/** Labels used in success/error result toasts. */
export const MEMBER_ACTION_RESULT_LABELS: Record<MemberBulkAction, string> = {
  notice: "Aviso enviado",
  remove: "Remoção",
  ban: "Banimento",
};

export async function postGroupMemberBulkAction(
  groupId: string,
  payload: {
    action: MemberBulkAction;
    telegramUserIds?: string[];
    allMatching?: { scope: "active_removable" | "active" | "all_tracked" };
    text?: string;
  },
): Promise<TelegramGroupMemberBulkActionResultDto> {
  const response = await fetch(
    `/api/telegram/groups/${encodeURIComponent(groupId)}/members/bulk-actions`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      raw &&
      typeof raw === "object" &&
      "error" in raw &&
      typeof (raw as { error?: unknown }).error === "string"
        ? (raw as { error: string }).error
        : "Não foi possível executar a ação.";
    throw new Error(message);
  }

  const parsed = telegramGroupMemberBulkActionResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Resposta inválida do servidor.");
  }

  return parsed.data;
}

export function groupActionTargetsByGroup(targets: MemberActionTarget[]) {
  const grouped = new Map<string, MemberActionTarget[]>();

  for (const target of targets) {
    const current = grouped.get(target.groupId) ?? [];
    current.push(target);
    grouped.set(target.groupId, current);
  }

  return grouped;
}

function resolveAllMatchingScope(
  action: MemberBulkAction,
): "active_removable" | "active" {
  return action === "notice" ? "active" : "active_removable";
}

export async function runMemberActions(params: {
  action: MemberBulkAction;
  targets: MemberActionTarget[];
  text?: string;
  onlyActive?: boolean;
}): Promise<MemberActionAggregate> {
  const filteredTargets = params.onlyActive
    ? params.targets.filter(
        (target) =>
          target.selectAllInGroup ||
          (target.status === "active" && !target.isOwner),
      )
    : params.targets;

  if (filteredTargets.length === 0) {
    throw new Error(
      params.onlyActive
        ? "Nenhum membro removível selecionado. O dono do grupo não pode ser removido ou banido."
        : "Nenhum membro selecionado para esta ação.",
    );
  }

  const grouped = groupActionTargetsByGroup(filteredTargets);
  const aggregate: MemberActionAggregate = {
    successCount: 0,
    failedCount: 0,
    failures: [],
  };

  for (const [groupId, groupTargets] of grouped) {
    const selectAllTarget = groupTargets.find(
      (target) => target.selectAllInGroup,
    );

    if (selectAllTarget) {
      const result = await postGroupMemberBulkAction(groupId, {
        action: params.action,
        allMatching: { scope: resolveAllMatchingScope(params.action) },
        ...(params.action === "notice"
          ? { text: params.text ?? DEFAULT_MEMBER_NOTICE_TEXT }
          : {}),
      });

      aggregate.successCount += result.successCount;
      aggregate.failedCount += result.failedCount;
      aggregate.failures.push(...result.failures);
      continue;
    }

    const telegramUserIds = groupTargets
      .map((target) => target.telegramUserId)
      .filter((value): value is string => Boolean(value));

    for (const chunk of chunkValues(
      telegramUserIds,
      BULK_ACTION_REQUEST_CHUNK_SIZE,
    )) {
      const result = await postGroupMemberBulkAction(groupId, {
        action: params.action,
        telegramUserIds: chunk,
        ...(params.action === "notice"
          ? { text: params.text ?? DEFAULT_MEMBER_NOTICE_TEXT }
          : {}),
      });

      aggregate.successCount += result.successCount;
      aggregate.failedCount += result.failedCount;
      aggregate.failures.push(...result.failures);
    }
  }

  return aggregate;
}

export function getMemberActionLoadingToast(
  action: MemberBulkAction,
  options?: { plural?: boolean },
) {
  const plural = options?.plural ?? false;

  switch (action) {
    case "notice":
      return {
        title: `Enviando "${DEFAULT_MEMBER_NOTICE_TEXT}"...`,
        description: plural
          ? "Enviando aviso no particular de cada membro."
          : "Enviando aviso no particular do membro.",
      };
    case "remove":
      return {
        title: plural ? "Removendo membros..." : "Removendo membro...",
        description: "Expulsando do grupo e liberando reentrada.",
      };
    case "ban":
      return {
        title: plural ? "Banindo membros..." : "Banindo membro...",
        description: "Aplicando banimento no grupo.",
      };
  }
}

export function formatMemberActionResultMessage(
  actionLabel: string,
  successCount: number,
  failedCount: number,
) {
  if (failedCount === 0) {
    return successCount === 1
      ? `${actionLabel} concluído.`
      : `${actionLabel} concluído para ${successCount} membros.`;
  }

  if (successCount === 0) {
    return failedCount === 1
      ? `Não foi possível ${actionLabel.toLowerCase()}.`
      : `Não foi possível ${actionLabel.toLowerCase()} para os membros selecionados.`;
  }

  return `${actionLabel}: ${successCount} com sucesso, ${failedCount} com falha.`;
}

export function reportMemberActionResultToasts(params: {
  actionLabel: string;
  result: MemberActionAggregate;
  toastId: string | number;
}): boolean {
  const { actionLabel, result, toastId } = params;
  const message = formatMemberActionResultMessage(
    actionLabel,
    result.successCount,
    result.failedCount,
  );

  if (result.failedCount === 0) {
    toast.success(message, { id: toastId });
    return true;
  }

  if (result.successCount === 0) {
    toast.error(message, {
      id: toastId,
      description: result.failures[0]?.reason,
    });
    return false;
  }

  toast.warning(message, {
    id: toastId,
    description: result.failures[0]?.reason,
  });
  return true;
}

export async function runMemberActionsWithToasts(params: {
  action: MemberBulkAction;
  targets: MemberActionTarget[];
  onlyActive?: boolean;
  plural?: boolean;
  actionLabel?: string;
}): Promise<{ hadSuccess: boolean; result?: MemberActionAggregate }> {
  const actionLabel =
    params.actionLabel ?? MEMBER_ACTION_RESULT_LABELS[params.action];
  const loadingToast = getMemberActionLoadingToast(params.action, {
    plural: params.plural,
  });
  const toastId = toast.loading(loadingToast.title, {
    description: loadingToast.description,
  });

  try {
    const result = await runMemberActions({
      action: params.action,
      targets: params.targets,
      text: DEFAULT_MEMBER_NOTICE_TEXT,
      onlyActive: params.onlyActive,
    });

    const hadSuccess = reportMemberActionResultToasts({
      actionLabel,
      result,
      toastId,
    });

    return { hadSuccess, result };
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Não foi possível executar a ação.",
      { id: toastId },
    );
    return { hadSuccess: false };
  }
}

export function createMemberActionTarget(params: {
  groupId: string;
  telegramUserId?: string;
  selectAllInGroup?: boolean;
  status?: "active" | "left";
  isOwner?: boolean;
}): MemberActionTarget {
  return params;
}

type UseMemberActionHandlerOptions = {
  onActionSuccess?: () => void;
};

export function useMemberActionHandler(
  options?: UseMemberActionHandlerOptions,
) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<MemberBulkAction | null>(
    null,
  );

  const runAction = useCallback(
    (params: {
      action: MemberBulkAction;
      targets: MemberActionTarget[];
      onlyActive?: boolean;
      plural?: boolean;
      actionLabel?: string;
      onAfterSuccess?: (action: MemberBulkAction) => void;
    }) => {
      if (pendingAction !== null) {
        return;
      }

      setPendingAction(params.action);
      void (async () => {
        try {
          const { hadSuccess, result } = await runMemberActionsWithToasts({
            action: params.action,
            targets: params.targets,
            onlyActive: params.onlyActive,
            plural: params.plural,
            actionLabel: params.actionLabel,
          });

          if (hadSuccess && result) {
            params.onAfterSuccess?.(params.action);
            options?.onActionSuccess?.();
            router.refresh();
          }
        } finally {
          setPendingAction(null);
        }
      })();
    },
    [options, pendingAction, router],
  );

  return {
    runAction,
    isPending: pendingAction !== null,
    pendingAction,
  };
}
