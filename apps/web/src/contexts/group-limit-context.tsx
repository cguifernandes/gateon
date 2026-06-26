"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  buildGroupLimitSnapshot,
  DEFAULT_PLAN_ID,
  type GroupLimitSnapshot,
  getMaxGroupsForPlan,
  PLAN_LABELS,
} from "@/lib/plan/limits";
import type { PlanId } from "@/lib/zod/plan-schemas";

type GroupLimitContextValue = GroupLimitSnapshot & {
  planId: PlanId;
  planLabel: string;
  setConnectedCount: (count: number) => void;
  incrementConnectedCount: (by?: number) => void;
  decrementConnectedCount: (by?: number) => void;
  setPlan: (planId: PlanId) => void;
};

const GroupLimitContext = createContext<GroupLimitContextValue | null>(null);

type GroupLimitProviderProps = {
  children: ReactNode;
  planId?: PlanId;
  initialConnectedCount?: number;
};

export function GroupLimitProvider({
  children,
  planId: initialPlanId = DEFAULT_PLAN_ID,
  initialConnectedCount = 0,
}: GroupLimitProviderProps) {
  const [planId, setPlanId] = useState<PlanId>(initialPlanId);
  const [connectedCount, setConnectedCountState] = useState(
    initialConnectedCount,
  );

  useEffect(() => {
    setPlanId(initialPlanId);
  }, [initialPlanId]);

  const maxGroups = getMaxGroupsForPlan(planId);

  const setConnectedCount = useCallback((count: number) => {
    setConnectedCountState(Math.max(0, count));
  }, []);

  const incrementConnectedCount = useCallback((by = 1) => {
    setConnectedCountState((prev) => prev + by);
  }, []);

  const decrementConnectedCount = useCallback((by = 1) => {
    setConnectedCountState((prev) => Math.max(0, prev - by));
  }, []);

  const setPlan = useCallback((nextPlanId: PlanId) => {
    setPlanId(nextPlanId);
  }, []);

  const value = useMemo<GroupLimitContextValue>(() => {
    const snapshot = buildGroupLimitSnapshot(connectedCount, maxGroups);

    return {
      ...snapshot,
      planId,
      planLabel: PLAN_LABELS[planId],
      setConnectedCount,
      incrementConnectedCount,
      decrementConnectedCount,
      setPlan,
    };
  }, [
    connectedCount,
    maxGroups,
    planId,
    setConnectedCount,
    incrementConnectedCount,
    decrementConnectedCount,
    setPlan,
  ]);

  return (
    <GroupLimitContext.Provider value={value}>
      {children}
    </GroupLimitContext.Provider>
  );
}

export function useGroupLimit(): GroupLimitContextValue {
  const context = useContext(GroupLimitContext);
  if (!context) {
    throw new Error("useGroupLimit must be used within GroupLimitProvider");
  }
  return context;
}
