import { z } from "zod";
import { planIdSchema } from "./plan-schemas";

export const stripePaymentGroupLimitSchema = z.object({
  planId: planIdSchema,
  planLabel: z.string(),
  maxDistinctGroups: z.number().int().nonnegative(),
  usedDistinctGroups: z.number().int().nonnegative(),
});

export type StripePaymentGroupLimit = z.infer<
  typeof stripePaymentGroupLimitSchema
>;

type StripeGroupLink = {
  telegramGroupId: string | null;
};

export function countDistinctLinkedStripeGroups(
  connections: StripeGroupLink[],
): number {
  const unique = new Set<string>();
  for (const connection of connections) {
    if (connection.telegramGroupId) {
      unique.add(connection.telegramGroupId);
    }
  }
  return unique.size;
}

export function getSelectableStripeLinkGroupIds(input: {
  connections: Array<{ id: string; telegramGroupId: string | null }>;
  connectionId?: string;
  maxDistinctGroups: number;
  allGroupIds: string[];
}): string[] {
  return input.allGroupIds.filter((groupId) => {
    const simulated = input.connections.map((connection) => ({
      telegramGroupId:
        input.connectionId && connection.id === input.connectionId
          ? groupId
          : connection.telegramGroupId,
    }));
    return (
      countDistinctLinkedStripeGroups(simulated) <= input.maxDistinctGroups
    );
  });
}
