"use client";

import { AvatarStack } from "@/components/avatar-stack";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Button } from "@/components/ui/button";
import {
  type AlertSummaryDto,
  resolveAlertTriggerLabel,
} from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import {
  buildDestinationItems,
  resolveDestinationsLabel,
} from "../alert-destination-items";

type AlertCardMessagePreviewProps = {
  alert: AlertSummaryDto;
  groups: TelegramGroupSummaryDto[];
};

export function AlertCardMessagePreview({
  alert,
  groups,
}: AlertCardMessagePreviewProps) {
  const destinationItems = buildDestinationItems(alert, groups);
  const destinationsLabel = resolveDestinationsLabel(alert);
  const messageTitle = alert.content.title?.trim() || "Mensagem sem título";
  const messageBody = alert.content.body?.trim() || "Sem conteúdo de mensagem.";
  const previewButtons = (alert.content.inlineButtons ?? [])
    .map((button) => button.text.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-border"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="border-border border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-foreground text-xs">{destinationsLabel}</p>

            {alert.triggerType ? (
              <span className="font-light text-muted-foreground text-xs">
                {resolveAlertTriggerLabel(alert.triggerType)}
              </span>
            ) : null}
          </div>
          {destinationItems.length > 0 ? (
            <AvatarStack
              avatarClassName="size-7"
              items={destinationItems}
              maxVisible={4}
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-y-1 px-3 py-4">
        <p className="font-medium text-foreground text-sm">{messageTitle}</p>
        <TruncatedTextTooltip
          text={messageBody}
          variant="line-clamp"
          lineClamp={2}
          className="font-light text-muted-foreground text-xs"
          tooltipClassName="text-xs"
        />
        {previewButtons.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {previewButtons.map((buttonLabel) => (
              <Button
                key={buttonLabel}
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                {buttonLabel}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
