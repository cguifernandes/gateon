import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { resolveAccountPlanCta } from "@/lib/plan/account-cta";
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
    <Link
      className={cn(
        buttonVariants({
          variant: cta.isUpgrade ? "default" : "outline",
          size: "sm",
        }),
        "w-full",
        className,
      )}
      href={cta.href}
    >
      {cta.label}
    </Link>
  );
}
