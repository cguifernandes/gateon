import {
  type StripeBillingConnectionDto,
  stripeBillingConnectionOptionsResponseSchema,
} from "@/lib/zod/stripe-billing-schemas";
import {
  fetchAuthenticatedUpstreamJson,
  resolveUpstreamSession,
} from "../fetch/authenticated-upstream";

export async function getStripeBillingConnectionOptions(): Promise<{
  connections: StripeBillingConnectionDto[];
  error: string | null;
}> {
  const session = await resolveUpstreamSession();
  if (!session.ok) {
    return { connections: [], error: session.error };
  }

  const result = await fetchAuthenticatedUpstreamJson({
    path: "/stripe-billing/connections/options",
    schema: stripeBillingConnectionOptionsResponseSchema,
    httpErrorMessage: "Não foi possível carregar as conexões Stripe.",
    includeUpstreamApiHeaders: true,
  });

  if (!result.ok) {
    return { connections: [], error: result.error };
  }

  return { connections: result.data.connections, error: null };
}
