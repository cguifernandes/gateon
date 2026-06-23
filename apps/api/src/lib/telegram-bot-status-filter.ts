export type BotStatusDisplayKind = 'active' | 'warning' | 'inactive' | 'error';

export type BotStatusFilterValue = 'all' | BotStatusDisplayKind;

export function normalizeTelegramBotStatus(rawStatus: string): string {
  return rawStatus.toLowerCase().replace(/_/g, '');
}

export function getBotStatusDisplayKind(
  rawStatus: string,
): BotStatusDisplayKind {
  const status = normalizeTelegramBotStatus(rawStatus);

  if (status === 'administrator' || status === 'creator') {
    return 'active';
  }
  if (status === 'left') {
    return 'inactive';
  }
  if (status === 'kicked') {
    return 'error';
  }
  if (status === 'member' || status === 'restricted') {
    return 'warning';
  }

  if (status.includes('active') || status.includes('connect')) {
    return 'active';
  }
  if (status.includes('fail') || status.includes('error')) {
    return 'error';
  }
  if (status.includes('pend') || status.includes('wait')) {
    return 'warning';
  }

  return 'inactive';
}

export function matchesBotStatusFilter(
  rawStatus: string,
  filter: BotStatusFilterValue,
): boolean {
  if (filter === 'all') {
    return true;
  }

  return getBotStatusDisplayKind(rawStatus) === filter;
}
