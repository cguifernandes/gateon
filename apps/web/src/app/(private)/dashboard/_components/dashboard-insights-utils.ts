import {
  type AlertSummaryDto,
  getAlertTargetGroupIds,
} from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

export type DatePreset = "24h" | "7d" | "30d" | "all";

export type DateRangeBounds = { from: Date | null; to: Date };

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  "24h": "24 horas",
  "7d": "7 dias",
  "30d": "30 dias",
  all: "Tudo",
};

export function getPresetRange(preset: DatePreset): DateRangeBounds {
  const to = new Date();
  if (preset === "all") return { from: null, to };
  const hours = preset === "24h" ? 24 : preset === "7d" ? 168 : 720;
  return { from: new Date(to.getTime() - hours * 3_600_000), to };
}

export function getPreviousRange(
  range: DateRangeBounds,
): DateRangeBounds | null {
  if (!range.from) return null;
  const duration = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime()),
  };
}

export function getSparklineIntervalDescription(
  preset: DatePreset,
  index: number,
  total: number,
  historicalRange?: DateRangeBounds,
) {
  const range =
    preset === "all" && historicalRange?.from
      ? historicalRange
      : getPresetRange(preset);

  if (!range.from) {
    return {
      title: `${index + 1}ª parte do histórico`,
      description: `Como o filtro está em "Tudo", o gráfico resume todo o histórico em ${total} partes iguais. Este ponto representa a ${index + 1}ª parte, da mais antiga (esquerda) à mais recente (direita).`,
    };
  }

  const durationMs = range.to.getTime() - range.from.getTime();
  const bucketMs = durationMs / total;
  const bucketStart = new Date(range.from.getTime() + index * bucketMs);
  const bucketEnd = new Date(range.from.getTime() + (index + 1) * bucketMs);

  const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const periodContext =
    preset === "all"
      ? "em todo o histórico"
      : preset === "24h"
        ? "nas últimas 24 horas"
        : preset === "7d"
          ? "nos últimos 7 dias"
          : "nos últimos 30 dias";

  const rangeLabel =
    preset === "all"
      ? `${fullDateFormatter.format(bucketStart)} – ${fullDateFormatter.format(bucketEnd)}`
      : preset === "24h"
        ? `${timeFormatter.format(bucketStart)} – ${timeFormatter.format(bucketEnd)}`
        : preset === "7d"
          ? `${dateTimeFormatter.format(bucketStart)} – ${dateTimeFormatter.format(bucketEnd)}`
          : `${dateFormatter.format(bucketStart)} – ${dateFormatter.format(bucketEnd)}`;

  return {
    title: rangeLabel,
    description: `Faixa ${index + 1} de ${total} ${periodContext}. O período foi dividido em partes iguais; este ponto mostra o valor registrado nesse intervalo de tempo.`,
  };
}

export function getGroupHistoricalRange(
  group: TelegramGroupSummaryDto,
): DateRangeBounds {
  const to = new Date();
  let earliest = new Date(group.connectedAt).getTime();

  for (const member of group.members) {
    if (member.joinedAt) {
      earliest = Math.min(earliest, new Date(member.joinedAt).getTime());
    }
    if (member.leftAt) {
      earliest = Math.min(earliest, new Date(member.leftAt).getTime());
    }
  }

  return {
    from: new Date(earliest),
    to,
  };
}

function isDateInRange(iso: string, range: DateRangeBounds) {
  const date = new Date(iso);
  if (range.from && date < range.from) return false;
  return date <= range.to;
}

export function isTimestampInRange(
  value: string | Date | null | undefined,
  range: DateRangeBounds,
) {
  if (!value) return false;
  const iso = value instanceof Date ? value.toISOString() : value;
  return isDateInRange(iso, range);
}

export function countNewMembersInRange(
  group: TelegramGroupSummaryDto,
  range: DateRangeBounds,
) {
  return group.members.filter((member) =>
    isTimestampInRange(member.joinedAt, range),
  ).length;
}

export function countRecentAlertDeliveries(
  groupId: string,
  alerts: AlertSummaryDto[],
  range: DateRangeBounds,
) {
  return filterAlertsForGroup(groupId, alerts)
    .filter((alert) => isTimestampInRange(alert.lastRunAt, range))
    .reduce(
      (sum, alert) =>
        sum + (alert.lastRun?.successCount ?? alert.recipientCount ?? 0),
      0,
    );
}

export function filterAlertsForGroupInRange(
  groupId: string,
  alerts: AlertSummaryDto[],
  range: DateRangeBounds,
) {
  return filterAlertsForGroupByPeriod(groupId, alerts, range).filter((alert) =>
    isTimestampInRange(alert.lastRunAt, range),
  );
}

export function filterAlertsForGroupByPeriod(
  groupId: string,
  alerts: AlertSummaryDto[],
  range: DateRangeBounds,
) {
  return filterAlertsForGroup(groupId, alerts)
    .filter((alert) => {
      if (!range.from) return true;
      return (
        isTimestampInRange(alert.lastRunAt, range) ||
        isTimestampInRange(alert.updatedAt, range)
      );
    })
    .sort((a, b) => {
      const aTime = Math.max(
        a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0,
        new Date(a.updatedAt).getTime(),
      );
      const bTime = Math.max(
        b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0,
        new Date(b.updatedAt).getTime(),
      );
      return bTime - aTime;
    });
}

export function countMemberExitsInRange(
  group: TelegramGroupSummaryDto,
  range: DateRangeBounds,
) {
  return group.members.filter(
    (member) =>
      member.leftAt != null && isTimestampInRange(member.leftAt, range),
  ).length;
}

export type MemberMovementType = "joined" | "left";

export type MemberMovementBadgeKind = "entrada" | "entrada-e-saida" | "saida";

export type MemberMovementPeriodSummary = {
  entradas: number;
  entradaESaida: number;
  saidas: number;
};

export type MemberMovementRow = {
  id: string;
  telegramUserId: string;
  displayName: string;
  profilePhotoUrl: string | null;
  movement: MemberMovementType;
  occurredAt: string;
  isActiveNow: boolean;
};

function getMemberDisplayName(
  member: TelegramGroupSummaryDto["members"][number],
) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  return name || `Membro ${member.telegramUserId}`;
}

export function getMemberMovementBadgeKind(
  row: MemberMovementRow,
): MemberMovementBadgeKind {
  if (row.movement === "joined") {
    return row.isActiveNow ? "entrada" : "entrada-e-saida";
  }

  return "saida";
}

export function getMemberMovementPeriodSummary(
  group: TelegramGroupSummaryDto,
  range: DateRangeBounds,
): MemberMovementPeriodSummary {
  let entradas = 0;
  let entradaESaida = 0;
  let saidas = 0;

  for (const member of group.members) {
    const isActiveNow = member.status !== "left";
    const joinedInRange = isTimestampInRange(member.joinedAt, range);

    if (joinedInRange) {
      if (isActiveNow) {
        entradas += 1;
      } else {
        entradaESaida += 1;
      }
    }

    if (member.leftAt && isTimestampInRange(member.leftAt, range)) {
      saidas += 1;
    }
  }

  return { entradas, entradaESaida, saidas };
}

export function getMemberMovementsInRange(
  group: TelegramGroupSummaryDto,
  range: DateRangeBounds,
  limit = 25,
): MemberMovementRow[] {
  const events: MemberMovementRow[] = [];

  for (const member of group.members) {
    const displayName = getMemberDisplayName(member);
    const isActiveNow = member.status !== "left";

    if (isTimestampInRange(member.joinedAt, range)) {
      events.push({
        id: `${member.telegramUserId}-joined-${member.joinedAt}`,
        telegramUserId: member.telegramUserId,
        displayName,
        profilePhotoUrl: member.profilePhotoUrl,
        movement: "joined",
        occurredAt: member.joinedAt,
        isActiveNow,
      });
    }

    if (member.leftAt && isTimestampInRange(member.leftAt, range)) {
      events.push({
        id: `${member.telegramUserId}-left-${member.leftAt}`,
        telegramUserId: member.telegramUserId,
        displayName,
        profilePhotoUrl: member.profilePhotoUrl,
        movement: "left",
        occurredAt: member.leftAt,
        isActiveNow,
      });
    }
  }

  const sortByRecent = (a: MemberMovementRow, b: MemberMovementRow) =>
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();

  const joined = events
    .filter((event) => event.movement === "joined")
    .sort(sortByRecent);
  const left = events
    .filter((event) => event.movement === "left")
    .sort(sortByRecent);
  const perTypeLimit = Math.ceil(limit / 2);

  return [...joined.slice(0, perTypeLimit), ...left.slice(0, perTypeLimit)]
    .sort(sortByRecent)
    .slice(0, limit);
}

export function getGroupExitRate(
  group: TelegramGroupSummaryDto,
  range: DateRangeBounds,
) {
  const exits = countMemberExitsInRange(group, range);
  const base = group.trackedMemberCount + exits;
  return base <= 0 ? 0 : Math.round((exits / base) * 100);
}

export function getGroupRetentionRate(group: TelegramGroupSummaryDto) {
  const total = group.trackedMemberCount + group.leftMemberCount;
  return total <= 0
    ? 100
    : Math.round((group.trackedMemberCount / total) * 100);
}

function filterAlertsForGroup(groupId: string, alerts: AlertSummaryDto[]) {
  return alerts.filter(
    (alert) =>
      alert.telegramGroupId === groupId ||
      getAlertTargetGroupIds(alert).includes(groupId),
  );
}

export function getGroupDeliveryRate(
  groupId: string,
  alerts: AlertSummaryDto[],
) {
  const groupAlerts = filterAlertsForGroup(groupId, alerts);
  if (groupAlerts.length === 0) return 0;
  return Math.round(
    groupAlerts.reduce((sum, alert) => sum + alert.deliveryRate, 0) /
      groupAlerts.length,
  );
}

export function computeTrendDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildExitSparkline(
  group: TelegramGroupSummaryDto,
  range: DateRangeBounds,
  points = 8,
) {
  if (!range.from) {
    const total = group.leftMemberCount;
    if (total <= 0) return Array.from({ length: points }, () => 0);
    const perBucket = Math.max(1, Math.floor(total / points));
    return Array.from({ length: points }, (_, index) =>
      Math.max(0, Math.min(perBucket, total - index * perBucket)),
    );
  }

  const bucketMs = (range.to.getTime() - range.from.getTime()) / points;
  const buckets = Array.from({ length: points }, () => 0);

  for (const member of group.members) {
    if (member.status !== "left" || !member.leftAt) continue;
    const timestamp = new Date(member.leftAt).getTime();
    if (timestamp < range.from.getTime() || timestamp > range.to.getTime()) {
      continue;
    }
    const index = Math.min(
      points - 1,
      Math.floor((timestamp - range.from.getTime()) / bucketMs),
    );
    buckets[index] = (buckets[index] ?? 0) + 1;
  }

  return buckets;
}

export function buildDeliverySparkline(
  groupId: string,
  alerts: AlertSummaryDto[],
  points = 8,
) {
  const groupAlerts = filterAlertsForGroup(groupId, alerts);
  if (groupAlerts.length === 0) return Array.from({ length: points }, () => 0);

  const rates = [...groupAlerts]
    .sort((a, b) => {
      const aTime = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
      const bTime = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
      return aTime - bTime;
    })
    .map((alert) => alert.deliveryRate);

  if (rates.length >= points) return rates.slice(-points);

  const padded = [...rates];
  while (padded.length < points) padded.unshift(padded[0] ?? 0);
  return padded;
}

export function buildRetentionSparkline(
  retentionRate: number,
  exitSparkline: number[],
) {
  const max = Math.max(...exitSparkline, 1);
  return exitSparkline.map((exits) =>
    Math.max(0, Math.round(retentionRate - (exits / max) * 12)),
  );
}
