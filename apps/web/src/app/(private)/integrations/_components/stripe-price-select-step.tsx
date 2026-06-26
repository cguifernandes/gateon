"use client";

import { LoaderIcon } from "@/components/icons/loader";
import { TrendingUpIcon } from "@/components/icons/trending-up";
import { SelectableOptionCard } from "@/components/selectable-option-card";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { StripeCatalogPriceDto } from "@/lib/zod/stripe-billing-schemas";

type StripePriceSelectStepProps = {
  prices: StripeCatalogPriceDto[];
  selectedPriceId: string | null;
  onSelectPrice: (priceId: string) => void;
  connectedPriceIds?: string[];
  isLoading?: boolean;
  errorMessage?: string | null;
};

export function StripePriceSelectStep({
  prices,
  selectedPriceId,
  onSelectPrice,
  connectedPriceIds = [],
  isLoading = false,
  errorMessage = null,
}: StripePriceSelectStepProps) {
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

  if (prices.length === 0) {
    return (
      <Empty className="h-full border border-border">
        <EmptyHeader>
          <EmptyMedia className="size-14 rounded-lg">
            <TrendingUpIcon
              className="text-primary"
              size={24}
              isAnimateOnView={false}
            />
          </EmptyMedia>
          <EmptyTitle>Nenhum plano recorrente encontrado</EmptyTitle>
          <EmptyDescription className="max-w-sm text-pretty">
            Crie um produto com preço recorrente no painel da Stripe e volte
            aqui para escolher qual plano o Gateon deve monitorar.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {prices.map((price, index) => {
        const isLastOddItem =
          prices.length % 2 !== 0 && index === prices.length - 1;
        const isAlreadyConnected = connectedPriceIds.includes(price.id);

        return (
          <SelectableOptionCard
            key={price.id}
            title={price.productName}
            description={price.productDescription ?? price.label}
            isSelected={selectedPriceId === price.id}
            disabled={isAlreadyConnected}
            AnimatedIcon={TrendingUpIcon}
            headerAction={
              isAlreadyConnected ? (
                <Badge variant="secondary">Já conectado</Badge>
              ) : (
                <Badge variant="outline">
                  {price.priceLabel ?? "Preço sob consulta"}
                </Badge>
              )
            }
            onSelect={() => onSelectPrice(price.id)}
            className={cn(isLastOddItem && "sm:col-span-2")}
          />
        );
      })}
    </div>
  );
}
