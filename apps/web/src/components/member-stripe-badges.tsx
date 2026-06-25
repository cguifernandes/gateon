import { MemberStripeCancelScheduledBadge } from "@/components/member-stripe-cancel-scheduled-badge";
import { MemberStripePayerBadge } from "@/components/member-stripe-payer-badge";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type LinkedStripePlan =
  TelegramGroupSummaryDto["members"][number]["linkedStripePlans"][number];

type MemberStripeBadgesProps = {
  plans: LinkedStripePlan[];
};

export function MemberStripeBadges({ plans }: MemberStripeBadgesProps) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <>
      <MemberStripePayerBadge plans={plans} />
      <MemberStripeCancelScheduledBadge plans={plans} />
    </>
  );
}
