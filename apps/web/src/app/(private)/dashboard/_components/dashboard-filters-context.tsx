"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DatePreset } from "./dashboard-insights-utils";

type DashboardFiltersContextValue = {
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  selectedGroupId: string;
  setSelectedGroupId: (groupId: string) => void;
};

const DashboardFiltersContext =
  createContext<DashboardFiltersContextValue | null>(null);

type DashboardFiltersProviderProps = {
  children: ReactNode;
  initialGroupId?: string;
};

export function DashboardFiltersProvider({
  children,
  initialGroupId = "",
}: DashboardFiltersProviderProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>("24h");
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);

  const value = useMemo(
    () => ({
      datePreset,
      setDatePreset,
      selectedGroupId,
      setSelectedGroupId,
    }),
    [datePreset, selectedGroupId],
  );

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = useContext(DashboardFiltersContext);
  if (!context) {
    throw new Error(
      "useDashboardFilters must be used within DashboardFiltersProvider",
    );
  }
  return context;
}
