import { endOfDay, startOfDay } from "date-fns";

import type { DateRangeValue } from "@/components/filters-popever";

export function matchesConnectedAtRange(
  connectedAtIso: string,
  range: DateRangeValue,
): boolean {
  if (!range?.from) {
    return true;
  }

  const connected = new Date(connectedAtIso);
  const from = startOfDay(range.from);
  const to = endOfDay(range.to ?? range.from);

  return connected >= from && connected <= to;
}
