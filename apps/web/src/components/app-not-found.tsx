"use client";

import Link from "next/link";
import { type ReactNode, useRef } from "react";
import { buildDestinationItems } from "@/app/(private)/alerts/_components/alert-destination-items";
import { AvatarStack, type AvatarStackItem } from "@/components/avatar-stack";
import {
  ArrowLeftIcon,
  type ArrowLeftIconHandle,
} from "@/components/icons/arrow-left";
import {
  ArrowRightIcon,
  type ArrowRightIconHandle,
} from "@/components/icons/arrow-right";
import { ImageComponent } from "@/components/image-component";
import { getTelegramGroupTypeDisplay } from "@/lib/telegram-chat-type";
import { cn, EMAIL_SUPPORT, withCacheBuster } from "@/lib/utils";
import {
  type AlertSummaryDto,
  resolveAlertTriggerLabel,
} from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { FileTextIcon } from "./icons/file-text";
import { MonitorIcon } from "./icons/monitor";
import { PlusIcon } from "./icons/plus";
import { RocketIcon } from "./icons/rocket";
import { TrendingUpIcon } from "./icons/trending-up";
import { Badge } from "./ui/badge";
import { buttonVariants } from "./ui/button";
import { Progress } from "./ui/progress";

type AppNotFoundProps = {
  title?: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  variant?: "default" | "home";
  suggestedGroups?: TelegramGroupSummaryDto[];
  suggestedAlerts?: AlertSummaryDto[];
};

// --- Suggested groups ---

const SUGGESTED_GROUPS_LIMIT = 3;

function pickSuggestedGroups(
  groups: TelegramGroupSummaryDto[],
  limit = SUGGESTED_GROUPS_LIMIT,
): TelegramGroupSummaryDto[] {
  return [...groups]
    .sort((a, b) => b.trackedMemberCount - a.trackedMemberCount)
    .slice(0, limit);
}

function formatConnectedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value),
  );
}

function getTrackedMembersProgressPercent(tracked: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((tracked / limit) * 100));
}

function formatConnectedByName(
  connectedBy: TelegramGroupSummaryDto["connectedBy"],
): string | null {
  if (!connectedBy) return null;
  const name = [connectedBy.firstName, connectedBy.lastName]
    .filter(Boolean)
    .join(" ");
  return name || null;
}

function buildGroupAvatarStackItems(
  group: TelegramGroupSummaryDto,
): AvatarStackItem[] {
  const fromMembers = group.members.slice(0, 4).map((member) => {
    const name =
      [member.firstName, member.lastName].filter(Boolean).join(" ") || "Membro";
    return {
      id: member.telegramUserId,
      name,
      tooltip: name,
      imageSrc: member.profilePhotoUrl,
      imageAlt: name,
      kind: "member" as const,
    };
  });

  if (fromMembers.length > 0) {
    return fromMembers;
  }

  const title = group.title?.trim() || "Grupo";
  return [
    {
      id: group.id,
      name: title,
      tooltip: title,
      imageSrc: group.chatPhotoUrl
        ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
        : null,
      imageAlt: title,
      kind: "group" as const,
    },
  ];
}

type SuggestedGroupCardProps = {
  group: TelegramGroupSummaryDto;
};

function SuggestedGroupCard({ group }: SuggestedGroupCardProps) {
  const { typeLabel, forumLabel } = getTelegramGroupTypeDisplay(
    group.type,
    group.isForum,
  );
  const title = group.title?.trim() || "Grupo sem nome";
  const connectedBy = formatConnectedByName(group.connectedBy);
  const progressPercent = getTrackedMembersProgressPercent(
    group.trackedMemberCount,
    group.trackedMemberLimitPerGroup,
  );

  return (
    <Link
      href={`/groups/${group.id}/bot`}
      className={cn(
        "group rounded-xl border border-border bg-card text-left",
        "transition-all duration-200 hover:border-primary/50 hover:bg-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-3">
          <ImageComponent
            src={
              group.chatPhotoUrl
                ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
                : null
            }
            alt={title}
            width={44}
            height={44}
            sizes="44px"
            avatarFallbackClassName="text-sm!"
            className="size-[44px] shrink-0 rounded-full border border-border object-cover"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate font-heading font-semibold text-foreground">
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {typeLabel}
              </Badge>
              {forumLabel ? (
                <Badge variant="outline" className="text-[10px]">
                  {forumLabel}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-1 text-[11px]">
            <span className="text-muted-foreground">Membros gerenciados</span>
            <span
              className={cn(
                "shrink-0 font-medium tabular-nums",
                group.trackedMemberLimitReached
                  ? "text-amber-600 dark:text-amber-500"
                  : "text-foreground",
              )}
            >
              {group.trackedMemberCount} / {group.trackedMemberLimitPerGroup}
            </span>
          </div>
          <Progress
            value={progressPercent}
            className={cn(
              "w-full flex-nowrap gap-0",
              group.trackedMemberLimitReached &&
                "**:data-[slot=progress-indicator]:bg-amber-500",
            )}
            aria-label={`Membros gerenciados: ${group.trackedMemberCount} de ${group.trackedMemberLimitPerGroup}`}
          />
        </div>

        <dl className="grid grid-cols-2 gap-5 text-xs">
          <div>
            <dt className="text-muted-foreground">No Telegram</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {group.memberCount ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Monitorados</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {group.trackedMemberCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Saíram do grupo</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {group.leftMemberCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Conectado em</dt>
            <dd className="font-medium text-foreground">
              {formatConnectedDate(group.connectedAt)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AvatarStack
            items={buildGroupAvatarStackItems(group)}
            maxVisible={3}
            avatarClassName="size-7"
            overflowButtonClassName="size-7 text-[11px]"
          />
          {connectedBy ? (
            <p className="truncate text-xs text-muted-foreground">
              Conectado por{" "}
              <span className="font-medium text-foreground">{connectedBy}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Abrir configuração do bot
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

type SuggestedGroupsSectionProps = {
  groups: TelegramGroupSummaryDto[];
};

function SuggestedGroupsSection({ groups }: SuggestedGroupsSectionProps) {
  const suggested = pickSuggestedGroups(groups);

  if (suggested.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading font-semibold tracking-tight text-foreground">
          Grupos sugeridos
        </h2>
        <Link
          href="/groups"
          className={cn(buttonVariants({ variant: "link" }), "w-fit p-0")}
        >
          Ver todos
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {suggested.map((group) => (
          <SuggestedGroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}

const SUGGESTED_ALERTS_LIMIT = 3;

const ALERT_DESTINATION_LABELS: Record<
  AlertSummaryDto["destinationType"],
  string
> = {
  GROUP: "Grupos",
  TOPIC: "Tópicos",
  MEMBERS: "Membros",
  QUICK_ALERT: "Aviso rápido",
  AUTOMATION: "Automação",
};

const ALERT_STATUS_LABELS: Record<AlertSummaryDto["status"], string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  FAILED: "Falhou",
};

const ALERT_STATUS_CLASSNAME: Record<AlertSummaryDto["status"], string> = {
  DRAFT: "border-border bg-muted/50 text-muted-foreground",
  ACTIVE:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  PAUSED:
    "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  FAILED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
};

function pickSuggestedAlerts(
  alerts: AlertSummaryDto[],
  limit = SUGGESTED_ALERTS_LIMIT,
): AlertSummaryDto[] {
  const statusRank: Record<AlertSummaryDto["status"], number> = {
    ACTIVE: 0,
    PAUSED: 1,
    DRAFT: 2,
    FAILED: 3,
  };

  return [...alerts]
    .sort((a, b) => {
      const statusDiff = statusRank[a.status] - statusRank[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.deliveryRate - a.deliveryRate;
    })
    .slice(0, limit);
}

function formatAlertDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function findGroupForAlert(
  alert: AlertSummaryDto,
  groups: TelegramGroupSummaryDto[],
): TelegramGroupSummaryDto | null {
  const groupId = alert.telegramGroupId ?? alert.group?.id;
  if (!groupId) return null;
  return groups.find((group) => group.id === groupId) ?? null;
}

type SuggestedAlertCardProps = {
  alert: AlertSummaryDto;
  groups: TelegramGroupSummaryDto[];
};

function SuggestedAlertCard({ alert, groups }: SuggestedAlertCardProps) {
  const relatedGroup = findGroupForAlert(alert, groups);
  const groupTitle =
    relatedGroup?.title?.trim() ||
    alert.group?.title?.trim() ||
    "Alerta sem grupo";
  const destinationItems = buildDestinationItems(alert, groups);
  const targetCount = alert.targets?.length ?? 0;
  const triggerLabel = resolveAlertTriggerLabel(alert.triggerType);

  return (
    <Link
      href="/alerts"
      className={cn(
        "group rounded-xl flex flex-col justify-between border border-border bg-card text-left",
        "transition-all duration-200 hover:border-primary/50 hover:bg-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        alert.status === "ACTIVE" &&
          alert.destinationType === "AUTOMATION" &&
          "border-t-2 border-t-green-500 hover:border-t-green-500",
      )}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-heading font-semibold text-foreground">
            {alert.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {ALERT_DESTINATION_LABELS[alert.destinationType]}
            </Badge>
            {triggerLabel ? (
              <Badge variant="outline" className="text-[10px]">
                {triggerLabel}
              </Badge>
            ) : null}
            {alert.destinationType === "AUTOMATION" && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  ALERT_STATUS_CLASSNAME[alert.status],
                )}
              >
                {ALERT_STATUS_LABELS[alert.status]}
              </Badge>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-5 text-xs">
          <div>
            <dt className="text-muted-foreground">Taxa de entrega</dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                alert.deliveryRate >= 80
                  ? "text-green-500"
                  : alert.deliveryRate >= 60
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-destructive",
              )}
            >
              {alert.deliveryRate}%
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Destinatários</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {alert.recipientCount ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Última execução</dt>
            <dd className="font-medium text-foreground">
              {formatAlertDate(alert.lastRunAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Grupo</dt>
            <dd className="truncate font-medium text-foreground">
              {groupTitle !== "Alerta sem grupo" ? groupTitle : "—"}
            </dd>
          </div>

          <div>
            <dt className="text-muted-foreground">Alvos no alerta</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {targetCount > 0 ? targetCount : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        {destinationItems.length > 0 ? (
          <AvatarStack
            items={destinationItems}
            maxVisible={3}
            avatarClassName="size-7"
            overflowButtonClassName="size-7 text-[11px]"
          />
        ) : null}
      </div>
    </Link>
  );
}

type SuggestedAlertsSectionProps = {
  alerts: AlertSummaryDto[];
  groups: TelegramGroupSummaryDto[];
};

function SuggestedAlertsSection({
  alerts,
  groups,
}: SuggestedAlertsSectionProps) {
  const suggested = pickSuggestedAlerts(alerts);

  if (suggested.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading font-semibold tracking-tight text-foreground">
          Alertas sugeridos
        </h2>
        <Link
          href="/alerts"
          className={cn(buttonVariants({ variant: "link" }), "w-fit p-0")}
        >
          Ver todos
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {suggested.map((alert) => (
          <SuggestedAlertCard key={alert.id} alert={alert} groups={groups} />
        ))}
      </div>
    </div>
  );
}

type ActionCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
};

function ActionCard({
  icon,
  title,
  description,
  href,
  linkLabel,
}: ActionCardProps) {
  const arrowRef = useRef<ArrowRightIconHandle>(null);

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0">
          {icon}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "link" }), "h-fit w-fit p-0")}
        onMouseEnter={() => arrowRef.current?.startAnimation()}
        onMouseLeave={() => arrowRef.current?.stopAnimation()}
      >
        {linkLabel} <ArrowRightIcon size={18} ref={arrowRef} />
      </Link>
    </div>
  );
}

export function AppNotFound({
  title = "Página não encontrada",
  description,
  backHref = "/dashboard",
  backLabel = "Voltar para o dashboard",
  variant = "default",
  suggestedGroups = [],
  suggestedAlerts = [],
}: AppNotFoundProps) {
  const refArrowLeftIcon = useRef<ArrowLeftIconHandle>(null);

  if (variant === "home") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="max-w-lg text-pretty font-light text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "default" }), "mt-1 w-fit")}
            onMouseEnter={() => refArrowLeftIcon.current?.startAnimation()}
            onMouseLeave={() => refArrowLeftIcon.current?.stopAnimation()}
          >
            <ArrowLeftIcon ref={refArrowLeftIcon} size={18} />
            {backLabel}
          </Link>
        </div>

        <div className="grid w-full gap-4 text-left sm:grid-cols-3">
          <ActionCard
            icon={<FileTextIcon size={18} className="text-primary" />}
            title="Central de ajuda"
            description="Perguntas frequentes, guias e respostas sobre como usar o Gateon."
            href="/#documentation"
            linkLabel="Acessar ajuda"
          />
          <ActionCard
            icon={<TrendingUpIcon size={18} className="text-primary" />}
            title="Ver planos"
            description="Compare recursos, limites e escolha o plano ideal para o seu negócio."
            href="/#pricing"
            linkLabel="Ver preços"
          />
          <ActionCard
            icon={<RocketIcon size={18} className="text-primary" />}
            title="Criar conta"
            description="Comece grátis e conecte seu primeiro grupo do Telegram em poucos minutos."
            href="/register"
            linkLabel="Começar agora"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="gap-8 flex w-full">
        <div className="flex flex-col w-1/2 gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            <p className="text-pretty font-light text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className={cn(buttonVariants({ variant: "default" }), "w-fit")}
              onMouseEnter={() => refArrowLeftIcon.current?.startAnimation()}
              onMouseLeave={() => refArrowLeftIcon.current?.stopAnimation()}
            >
              <ArrowLeftIcon ref={refArrowLeftIcon} size={18} />
              {backLabel}
            </Link>

            <Link
              href={`mailto:${EMAIL_SUPPORT}`}
              className={cn(buttonVariants({ variant: "link" }), "w-fit p-0")}
            >
              Envie um email
            </Link>
          </div>
        </div>

        <div className="flex flex-col w-1/2 gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <ActionCard
              icon={<MonitorIcon size={18} className="text-primary" />}
              title="Dashboard"
              description="Retorne à visão geral e acompanhe a operação dos seus grupos conectados."
              href="/dashboard"
              linkLabel="Ir para o dashboard"
            />
            <ActionCard
              icon={<PlusIcon size={18} className="text-primary" />}
              title="Grupos"
              description="Gerencie seus grupos conectados e configure o bot do Gateon."
              href="/groups"
              linkLabel="Ver grupos"
            />
          </div>
        </div>
      </div>

      <SuggestedGroupsSection groups={suggestedGroups} />
      <SuggestedAlertsSection
        alerts={suggestedAlerts}
        groups={suggestedGroups}
      />
    </div>
  );
}
