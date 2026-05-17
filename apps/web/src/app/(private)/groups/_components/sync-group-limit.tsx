"use client";

import { useEffect } from "react";
import { useGroupLimit } from "@/contexts/group-limit-context";

type SyncGroupLimitProps = {
  connectedCount: number;
};

export function SyncGroupLimit({ connectedCount }: SyncGroupLimitProps) {
  const { setConnectedCount } = useGroupLimit();

  useEffect(() => {
    setConnectedCount(connectedCount);
  }, [connectedCount, setConnectedCount]);

  return null;
}
