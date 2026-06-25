"use client";

import { CreditCard } from "lucide-react";
import { useRef } from "react";
import { RocketIcon, type RocketIconHandle } from "@/components/icons/rocket";
import { DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import { resolveAccountPlanCta } from "@/lib/account-plan-cta";
import { cn } from "@/lib/utils";
import type { PlanId } from "@/lib/zod/plan-schemas";

type AccountPlanCtaMenuItemProps = {
  planId: PlanId;
};

export function AccountPlanCtaMenuItem({
  planId,
}: AccountPlanCtaMenuItemProps) {
  const cta = resolveAccountPlanCta(planId);
  const rocketIconRef = useRef<RocketIconHandle>(null);

  if (cta.isUpgrade) {
    return (
      <DropdownMenuLinkItem
        href={cta.href}
        closeOnClick
        onMouseEnter={() => rocketIconRef.current?.startAnimation()}
        onMouseLeave={() => rocketIconRef.current?.stopAnimation()}
        className="cursor-pointer group hover:bg-accent hover:text-accent-foreground"
      >
        <RocketIcon
          ref={rocketIconRef}
          size={16}
          className="text-muted-foreground group-hover:text-foreground transition-colors duration-200 ease-in-out"
        />
        Melhorar seu plano
      </DropdownMenuLinkItem>
    );
  }

  return (
    <DropdownMenuLinkItem
      href={cta.href}
      closeOnClick
      className="cursor-pointer group hover:bg-accent hover:text-accent-foreground"
    >
      <CreditCard
        size={16}
        className={cn(
          "text-muted-foreground group-hover:text-foreground transition-colors duration-200 ease-in-out",
        )}
        aria-hidden
      />
      Assinatura
    </DropdownMenuLinkItem>
  );
}
