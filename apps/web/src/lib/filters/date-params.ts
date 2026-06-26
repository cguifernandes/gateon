import type { DateRangeValue } from "@/components/filters-popever";

const DATE_PARAM_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseUrlDateParam(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const match = DATE_PARAM_RE.exec(value);
  if (!match) {
    return undefined;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatUrlDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseUrlDateRange(
  fromKey: string,
  toKey: string,
  params: Pick<URLSearchParams, "get">,
): DateRangeValue {
  const from = parseUrlDateParam(params.get(fromKey));
  const to = parseUrlDateParam(params.get(toKey));

  return from !== undefined ? { from, to } : undefined;
}

export function setUrlDateRangeParams(
  params: URLSearchParams,
  fromKey: string,
  toKey: string,
  range: DateRangeValue,
): void {
  if (range?.from) {
    params.set(fromKey, formatUrlDateParam(range.from));
    if (range.to) {
      params.set(toKey, formatUrlDateParam(range.to));
    } else {
      params.delete(toKey);
    }
  } else {
    params.delete(fromKey);
    params.delete(toKey);
  }
}
