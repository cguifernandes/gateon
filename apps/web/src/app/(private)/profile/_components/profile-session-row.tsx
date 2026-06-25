"use client";

import { MonitorIcon } from "@/components/icons/monitor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatSessionActivity,
  getSessionDeviceTitle,
  getSessionIpLabel,
  getSessionLocationLabel,
  type ProfileSessionDto,
} from "./profile-session-display";

type ProfileSessionRowProps = {
  session: ProfileSessionDto;
  onRevoke: (sessionId: string) => void;
  isRevoking: boolean;
  revokeDisabled: boolean;
};

type SessionMetaItemProps = {
  label: string;
  value: string;
};

function SessionMetaItem({ label, value }: SessionMetaItemProps) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-foreground text-sm">{value}</p>
      </div>
    </div>
  );
}

export function ProfileSessionRow({
  session,
  onRevoke,
  isRevoking,
  revokeDisabled,
}: ProfileSessionRowProps) {
  const deviceTitle = getSessionDeviceTitle(session);
  const activityLabel = formatSessionActivity(session);

  return (
    <article
      className={cn(
        "grid gap-4 border-b border-border p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-center sm:gap-5 sm:p-5",
        session.isCurrent && "bg-primary/10",
      )}
    >
      <div className="flex min-w-0 gap-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg ring-1",
            session.isCurrent
              ? "bg-primary/10 text-primary ring-primary/25"
              : "bg-muted text-muted-foreground ring-border",
          )}
        >
          <MonitorIcon size={20} isAnimateOnView={false} />
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="font-heading font-semibold text-foreground">
              {deviceTitle}
            </h3>
            {session.isCurrent ? (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-[10px] text-primary uppercase tracking-wide"
              >
                Sessão atual
              </Badge>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SessionMetaItem
              label="Localização"
              value={getSessionLocationLabel(session)}
            />
            <SessionMetaItem
              label="Endereço IP"
              value={getSessionIpLabel(session)}
            />
            <SessionMetaItem label="Atividade" value={activityLabel} />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex w-full sm:justify-end",
          session.isCurrent && "hidden sm:flex",
        )}
      >
        {!session.isCurrent ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full sm:w-full"
            onClick={() => onRevoke(session.id)}
            loading={isRevoking}
            disabled={revokeDisabled}
          >
            Revogar acesso
          </Button>
        ) : null}
      </div>
    </article>
  );
}
