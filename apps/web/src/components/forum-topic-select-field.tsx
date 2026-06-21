"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { LoaderIcon } from "@/components/icons/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AlertUpsertInput } from "@/lib/zod/alert-schemas";
import { RefreshCWIcon, type RefreshCWIconHandle } from "./icons/refresh-cw";

export type ForumTopic = {
  messageThreadId: number;
  name: string;
  iconColor?: number;
  isClosed: boolean;
  createdAt: string;
};

function parseForumTopic(value: unknown): ForumTopic | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.messageThreadId !== "number" || typeof raw.name !== "string") {
    return null;
  }

  return {
    messageThreadId: raw.messageThreadId,
    name: raw.name,
    iconColor: typeof raw.iconColor === "number" ? raw.iconColor : undefined,
    isClosed: raw.isClosed === true,
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

export type ForumTopicPickerProps = {
  groupId?: string;
  fieldIdPrefix: string;
  error?: string;
  selectedThreadIds: number[];
  onSelectedThreadIdsChange: (threadIds: number[]) => void;
};

export function ForumTopicPicker({
  groupId,
  fieldIdPrefix,
  error,
  selectedThreadIds,
  onSelectedThreadIdsChange,
}: ForumTopicPickerProps) {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualThreadId, setManualThreadId] = useState("");
  const [manualThreadIds, setManualThreadIds] = useState<number[]>([]);
  const previousGroupIdRef = useRef<string | undefined>(undefined);
  const loadAbortRef = useRef<AbortController | null>(null);
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);

  const syncedTopicIds = useMemo(
    () => new Set(topics.map((topic) => topic.messageThreadId)),
    [topics],
  );

  const displayedManualThreadIds = useMemo(
    () =>
      manualThreadIds
        .filter((threadId) => selectedThreadIds.includes(threadId))
        .sort((left, right) => left - right),
    [manualThreadIds, selectedThreadIds],
  );

  const syncedSelectedCount = useMemo(
    () =>
      selectedThreadIds.filter((threadId) => syncedTopicIds.has(threadId))
        .length,
    [selectedThreadIds, syncedTopicIds],
  );

  const setSelectedThreadIds = useCallback(
    (nextThreadIds: number[]) => {
      const normalized = [...new Set(nextThreadIds)].filter(
        (threadId) => Number.isFinite(threadId) && threadId > 0,
      );
      onSelectedThreadIdsChange(normalized);
    },
    [onSelectedThreadIdsChange],
  );

  const toggleTopic = useCallback(
    (threadId: number, checked: boolean) => {
      const next = checked
        ? [...new Set([...selectedThreadIds, threadId])]
        : selectedThreadIds.filter((currentId) => currentId !== threadId);
      setSelectedThreadIds(next);
    },
    [selectedThreadIds, setSelectedThreadIds],
  );

  const removeManualThreadId = useCallback(
    (threadId: number) => {
      setManualThreadIds((current) =>
        current.filter((currentId) => currentId !== threadId),
      );
      setSelectedThreadIds(
        selectedThreadIds.filter((currentId) => currentId !== threadId),
      );
    },
    [selectedThreadIds, setSelectedThreadIds],
  );

  const loadTopics = useCallback(
    async (signal: AbortSignal, options?: { refresh?: boolean }) => {
      if (!groupId) return;

      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await fetch(
          `/api/alerts/groups/${encodeURIComponent(groupId)}/forum-topics?refresh=${Date.now()}`,
          { cache: "no-store", signal },
        );
        if (!response.ok) {
          throw new Error("Failed to load forum topics");
        }
        const data: unknown = await response.json();
        if (Array.isArray(data)) {
          setTopics(
            data
              .map((item) => parseForumTopic(item))
              .filter((item): item is ForumTopic => item !== null),
          );
        }
      } catch {
        if (signal.aborted) return;
        setTopics([]);
      } finally {
        if (!signal.aborted) {
          if (options?.refresh) {
            setIsRefreshing(false);
          } else {
            setIsLoading(false);
          }
        }
      }
    },
    [groupId],
  );

  useEffect(() => {
    setManualThreadIds((current) =>
      current.filter((threadId) => !syncedTopicIds.has(threadId)),
    );
  }, [syncedTopicIds]);

  useEffect(() => {
    const previousGroupId = previousGroupIdRef.current;
    previousGroupIdRef.current = groupId;

    if (previousGroupId !== undefined && previousGroupId !== groupId) {
      setSelectedThreadIds([]);
      setManualThreadIds([]);
      setManualThreadId("");
    }

    if (!groupId) {
      setTopics([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    void loadTopics(controller.signal);

    return () => {
      controller.abort();
    };
  }, [groupId, loadTopics, setSelectedThreadIds]);

  const handleRefreshTopics = () => {
    if (!groupId || isRefreshing) return;
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    void loadTopics(controller.signal, { refresh: true });
  };

  const handleAddManualThreadId = () => {
    const nextValue = Number(manualThreadId);
    if (!Number.isFinite(nextValue) || nextValue <= 0) return;

    if (syncedTopicIds.has(nextValue)) {
      toggleTopic(nextValue, true);
      setManualThreadId("");
      return;
    }

    if (selectedThreadIds.includes(nextValue)) {
      setManualThreadId("");
      return;
    }

    setManualThreadIds((current) => [...new Set([...current, nextValue])]);
    setSelectedThreadIds([...selectedThreadIds, nextValue]);
    setManualThreadId("");
  };

  if (!groupId) {
    return (
      <Field>
        <FieldLabel>
          Tópicos
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        </FieldLabel>
        <FieldDescription>
          Selecione um grupo com fórum habilitado para listar os tópicos.
        </FieldDescription>
      </Field>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 py-10 justify-center text-muted-foreground text-sm"
        aria-live="polite"
        aria-busy="true"
      >
        <LoaderIcon animateOnHover={false} size={20} />
        Carregando tópicos do grupo…
      </div>
    );
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <FieldLabel>
            Tópicos
            <span className="text-destructive" aria-hidden="true">
              {" "}
              *
            </span>
          </FieldLabel>
          <FieldDescription>
            Marque um ou mais tópicos. Eles são sincronizados pelo bot — se um
            tópico novo não aparecer, renomeie-o no Telegram, clique em
            atualizar ou envie uma mensagem nesse tópico.
          </FieldDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={handleRefreshTopics}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          aria-label="Atualizar lista de tópicos"
          onMouseEnter={() => refreshIconRef.current?.startAnimation()}
          onMouseLeave={() => refreshIconRef.current?.stopAnimation()}
        >
          <RefreshCWIcon
            ref={refreshIconRef}
            className={cn(isRefreshing && "animate-spin", "text-foreground!")}
            size={16}
          />
        </Button>
      </div>

      {topics.length === 0 ? (
        <p className="text-muted-foreground text-center py-10 text-sm">
          Nenhum tópico sincronizado ainda.
        </p>
      ) : (
        <ul
          aria-invalid={Boolean(error)}
          aria-label={`Tópicos sincronizados: ${syncedSelectedCount} de ${topics.length} selecionado(s)`}
          className={cn(
            "max-h-56 list-none overflow-y-auto rounded-lg border ring-offset-[1.5px] dark:ring-offset-neutral-800",
            error
              ? "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
              : "border-border",
          )}
        >
          {topics.map((topic, index) => {
            const isSelected = selectedThreadIds.includes(
              topic.messageThreadId,
            );
            const isDisabled = topic.isClosed;
            const checkboxId = `${fieldIdPrefix}-topic-${topic.messageThreadId}`;

            return (
              <li
                key={topic.messageThreadId}
                className={cn(index > 0 && "border-border border-t")}
              >
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5",
                    !isDisabled && "cursor-pointer hover:bg-muted/50",
                    isDisabled && "cursor-not-allowed opacity-60",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    id={checkboxId}
                    className="group-has-disabled/field:opacity-100"
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={(checked) => {
                      toggleTopic(topic.messageThreadId, checked === true);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-sm">
                      {topic.name}
                    </span>
                    <p className="text-muted-foreground text-xs">
                      ID Telegram: {topic.messageThreadId}
                    </p>
                  </div>
                  {topic.isClosed ? (
                    <Badge variant="secondary" className="shrink-0">
                      Fechado
                    </Badge>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <FieldSeparator className="my-3">ou</FieldSeparator>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${fieldIdPrefix}-topic-id`}>
          Adicionar por ID
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id={`${fieldIdPrefix}-topic-id`}
            type="number"
            min={1}
            placeholder="Ex.: 1"
            aria-invalid={Boolean(error)}
            value={manualThreadId}
            onChange={(event) => setManualThreadId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddManualThreadId();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 text-foreground!"
            onClick={handleAddManualThreadId}
            disabled={!manualThreadId.trim()}
          >
            Adicionar
          </Button>
        </div>

        {displayedManualThreadIds.length > 0 ? (
          <ul
            aria-label="Tópicos adicionados manualmente"
            className="list-none rounded-md border border-dashed border-border bg-primary/10"
          >
            {displayedManualThreadIds.map((threadId, index) => (
              <li
                key={threadId}
                className={cn(
                  "flex items-center justify-between gap-3 py-2 px-3 text-sm",
                  index > 0 && "border-border border-t",
                )}
              >
                <span className="text-foreground">ID Telegram: {threadId}</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => removeManualThreadId(threadId)}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selectedThreadIds.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {selectedThreadIds.length} tópico(s) selecionado(s)
        </p>
      ) : null}

      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

type ForumTopicSelectFieldProps = {
  form: UseFormReturn<AlertUpsertInput>;
  groupId?: string;
  fieldIdPrefix: string;
  error?: string;
};

export function ForumTopicSelectField({
  form,
  groupId,
  fieldIdPrefix,
  error,
}: ForumTopicSelectFieldProps) {
  const selectedThreadIds = (form.watch(
    "triggerConfig.targetMessageThreadIds",
  ) ?? []) as number[];

  const setSelectedThreadIds = useCallback(
    (nextThreadIds: number[]) => {
      const normalized = [...new Set(nextThreadIds)].filter(
        (threadId) => Number.isFinite(threadId) && threadId > 0,
      );
      form.setValue("triggerConfig.targetMessageThreadIds", normalized, {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.setValue("messageThreadId", normalized[0], {
        shouldDirty: true,
        shouldValidate: false,
      });
      if (normalized.length > 0) {
        form.clearErrors("triggerConfig.targetMessageThreadIds");
      }
    },
    [form],
  );

  return (
    <ForumTopicPicker
      groupId={groupId}
      fieldIdPrefix={fieldIdPrefix}
      error={error}
      selectedThreadIds={selectedThreadIds}
      onSelectedThreadIdsChange={setSelectedThreadIds}
    />
  );
}
