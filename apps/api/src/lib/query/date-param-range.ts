import { endOfDay, startOfDay } from 'date-fns';

function parseDateParam(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildDateParamRange(
  from?: string,
  to?: string,
): { gte: Date; lte: Date } | undefined {
  const fromDate = parseDateParam(from);
  if (!fromDate) {
    return undefined;
  }

  const toDate = parseDateParam(to) ?? fromDate;
  return {
    gte: startOfDay(fromDate),
    lte: endOfDay(toDate),
  };
}
