import Link from "next/link";
import { Button } from "@/components/ui/button";
import { resolveAccountPlanCta } from "@/lib/account-plan-cta";
import { cn } from "@/lib/utils";
import type { PlanId } from "@/lib/zod/plan-schemas";

type AccountPlanCtaButtonProps = {
  planId: PlanId;
  className?: string;
};

export function AccountPlanCtaButton({
  planId,
  className,
}: AccountPlanCtaButtonProps) {
  const cta = resolveAccountPlanCta(planId);

  return (
    <Button
      size="sm"
      variant={cta.isUpgrade ? "default" : "outline"}
      className={cn("w-full", className)}
    >
      <Link href={cta.href}>{cta.label}</Link>
    </Button>
  );
}
