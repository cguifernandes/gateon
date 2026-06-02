"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AlertDeliveryRecordDto,
  type AlertRunRecordDto,
  alertDeliveryListSchema,
  alertRunListSchema,
} from "@/lib/zod/alert-schemas";

function pickDefaultRunId(
  runs: AlertRunRecordDto[],
  preferredRunId?: string | null,
) {
  if (preferredRunId && runs.some((run) => run.id === preferredRunId)) {
    return preferredRunId;
  }

  const runWithFailures = runs.find((run) => run.failCount > 0);
  return runWithFailures?.id ?? runs[0]?.id ?? null;
}

export function useAlertRunHistory(
  alertId: string | null,
  open: boolean,
  preferredRunId?: string | null,
) {
  const [runs, setRuns] = useState<AlertRunRecordDto[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<AlertDeliveryRecordDto[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runsRequestIdRef = useRef(0);
  const deliveriesRequestIdRef = useRef(0);

  const loadRuns = useCallback(async () => {
    if (!alertId) {
      return;
    }

    setLoadingRuns(true);
    setError(null);

    const requestId = ++runsRequestIdRef.current;

    try {
      const response = await fetch(`/api/alerts/${alertId}/runs`, {
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("Não foi possível carregar o histórico de execuções.");
      }

      const parsed = alertRunListSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("Resposta inválida do histórico de execuções.");
      }

      if (runsRequestIdRef.current !== requestId) {
        return;
      }

      setRuns(parsed.data);
      setSelectedRunId(pickDefaultRunId(parsed.data, preferredRunId));
    } catch (loadError) {
      if (runsRequestIdRef.current !== requestId) {
        return;
      }

      setRuns([]);
      setSelectedRunId(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o histórico de execuções.",
      );
    } finally {
      if (runsRequestIdRef.current === requestId) {
        setLoadingRuns(false);
      }
    }
  }, [alertId, preferredRunId]);

  const loadDeliveries = useCallback(async () => {
    if (!alertId || !selectedRunId) {
      setDeliveries([]);
      return;
    }

    setLoadingDeliveries(true);
    setError(null);
    const requestId = ++deliveriesRequestIdRef.current;

    try {
      const response = await fetch(
        `/api/alerts/${alertId}/runs/${selectedRunId}/deliveries`,
        { cache: "no-store" },
      );
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("Não foi possível carregar os detalhes da execução.");
      }

      const parsed = alertDeliveryListSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("Resposta inválida dos detalhes da execução.");
      }

      if (deliveriesRequestIdRef.current !== requestId) {
        return;
      }

      setDeliveries(parsed.data);
    } catch (loadError) {
      if (deliveriesRequestIdRef.current !== requestId) {
        return;
      }

      setDeliveries([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os detalhes da execução.",
      );
    } finally {
      if (deliveriesRequestIdRef.current === requestId) {
        setLoadingDeliveries(false);
      }
    }
  }, [alertId, selectedRunId]);

  useEffect(() => {
    if (!open || !alertId) {
      return;
    }

    void loadRuns();
  }, [alertId, loadRuns, open]);

  useEffect(() => {
    if (!open || !selectedRunId) {
      setDeliveries([]);
      return;
    }

    void loadDeliveries();
  }, [loadDeliveries, open, selectedRunId]);

  const selectedRun =
    runs.find((run) => run.id === selectedRunId) ?? null;
  const failedDeliveries = deliveries.filter(
    (delivery) => delivery.status === "FAILED" && delivery.error?.trim(),
  );

  return {
    runs,
    selectedRun,
    selectedRunId,
    setSelectedRunId,
    deliveries,
    failedDeliveries,
    loadingRuns,
    loadingDeliveries,
    error,
    reload: loadRuns,
  };
}
