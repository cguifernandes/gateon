import { z } from "zod";

export const planIdSchema = z.enum(["free", "starter", "pro"]);

export type PlanId = z.infer<typeof planIdSchema>;

export const planGroupLimitsSchema = z.record(
  planIdSchema,
  z.number().int().nonnegative(),
);
