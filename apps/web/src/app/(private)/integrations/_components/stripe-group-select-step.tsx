"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { LoaderIcon } from "@/components/icons/loader";
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
import {
  type TelegramGroupSummaryDto,
  telegramGroupsResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import { StripePaymentGroupLimitBadge } from "./stripe-payment-group-limit-badge";

type StripeGroupSelectStepProps = {
  selectedGroupId: string | null;
  onSelectGroup: (group: TelegramGroupSummaryDto) => void;
  stripePaymentGroupLimit: StripePaymentGroupLimit;
  existingConnections: Array<{
    id: string;
    telegramGroupId: string | null;
  }>;
};

function readErrorMessage(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }

  return fallback;
}

export function StripeGroupSelectStep({
  selectedGroupId,
  onSelectGroup,
  stripePaymentGroupLimit,
  existingConnections,
}: StripeGroupSelectStepProps) {
  const [groups, setGroups] = useState<TelegramGroupSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/telegram/groups", {
          cache: "no-store",
        });
        const body: unknown = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok) {
          setGroups([]);
          setErrorMessage(
            readErrorMessage(
              body,
              "Não foi possível carregar os grupos conectados.",
            ),
          );
          return;
        }

        const parsed = telegramGroupsResponseSchema.safeParse(body);
        if (!parsed.success) {
          setGroups([]);
          setErrorMessage("A resposta da API veio em formato inválido.");
          return;
        }

        setGroups(parsed.data);
      } catch {
        if (cancelled) return;
        setGroups([]);
        setErrorMessage("A API demorou para responder. Tente novamente.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectableGroupIds = getSelectableStripeLinkGroupIds({
    connections: existingConnections,
    maxDistinctGroups: stripePaymentGroupLimit.maxDistinctGroups,
    allGroupIds: groups.map((group) => group.id),
  });
  const selectableGroups = groups.filter((group) =>
    selectableGroupIds.includes(group.id),
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderIcon size={20} />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
        {errorMessage}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Empty className="h-full border-0 bg-transparent">
        <EmptyHeader>
          <EmptyMedia className="size-14 rounded-lg bg-muted">
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
            <EmptyMedia className="size-14 rounded-lg bg-primary/15 ring-1 ring-primary/25">
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
