"use client";

import Link from "next/link";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { UsersIcon } from "@/components/icons/users";
import { ImageComponent } from "@/components/image-component";
import { SelectableOptionCard } from "@/components/selectable-option-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn, withCacheBuster } from "@/lib/utils";
import type { StripePaymentGroupLimit } from "@/lib/zod/stripe-payment-group-schemas";
import { getSelectableStripeLinkGroupIds } from "@/lib/zod/stripe-payment-group-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { StripePaymentGroupLimitBadge } from "./stripe-payment-group-limit-badge";

type StripeGroupSelectStepProps = {
  groups: TelegramGroupSummaryDto[];
  selectedGroupId: string | null;
  onSelectGroup: (group: TelegramGroupSummaryDto) => void;
  stripePaymentGroupLimit: StripePaymentGroupLimit;
  existingConnections: Array<{
    id: string;
    telegramGroupId: string | null;
  }>;
};

export function StripeGroupSelectStep({
  groups,
  selectedGroupId,
  onSelectGroup,
  stripePaymentGroupLimit,
  existingConnections,
}: StripeGroupSelectStepProps) {
  const selectableGroupIds = getSelectableStripeLinkGroupIds({
    connections: existingConnections,
    maxDistinctGroups: stripePaymentGroupLimit.maxDistinctGroups,
    allGroupIds: groups.map((group) => group.id),
  });
  const selectableGroups = groups.filter((group) =>
    selectableGroupIds.includes(group.id),
  );

  if (groups.length === 0) {
    return (
      <Empty className="h-full border-0 bg-transparent">
        <EmptyHeader>
          <EmptyMedia className="size-14 rounded-lg">
            <UsersIcon className="text-primary" size={24} />
          </EmptyMedia>
          <EmptyTitle>Nenhum grupo conectado</EmptyTitle>
          <EmptyDescription className="max-w-sm text-pretty">
            Conecte um grupo no painel antes de vincular um plano Stripe.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            className="w-40!"
            render={<Link href="/groups" />}
          >
            Ir para Grupos
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <StripePaymentGroupLimitBadge limit={stripePaymentGroupLimit} />

      {selectableGroups.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {selectableGroups.map((group, index) => {
            const isLastOddItem =
              selectableGroups.length % 2 !== 0 &&
              index === selectableGroups.length - 1;
            const title = group.title?.trim() || "Sem título";

            return (
              <SelectableOptionCard
                key={group.id}
                title={title}
                description={`Membros: ${group?.memberCount?.toString() ?? "0"}`}
                isSelected={selectedGroupId === group.id}
                mediaVariant="logo"
                media={
                  <ImageComponent
                    src={
                      group.chatPhotoUrl
                        ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
                        : null
                    }
                    alt={title}
                    width={40}
                    height={40}
                    sizes="40px"
                    className="max-h-[40px]w-auto rounded-full object-contain"
                  />
                }
                mediaClassName="h-fit w-fit shrink-0 bg-transparent border-0 p-0"
                onSelect={() => onSelectGroup(group)}
                className={cn(isLastOddItem && "sm:col-span-2")}
              />
            );
          })}
        </div>
      ) : (
        <Empty className="border border-border bg-background/70 h-full py-8">
          <EmptyHeader>
            <EmptyMedia className="size-14 rounded-lg">
              <BadgeAlertIcon
                className="text-primary"
                size={24}
                isAnimateOnView={false}
              />
            </EmptyMedia>
            <EmptyTitle>Limite de grupos atingido</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Seu plano {stripePaymentGroupLimit.planLabel} já usa o máximo de
              grupos distintos. Vincule este produto a um grupo já usado por
              outro plano ou faça upgrade do plano Gateon.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
