import Link from "next/link";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { StripeBillingStatusDto } from "@/lib/zod/stripe-billing-schemas";

type DashboardStripeBillingTableProps = {
  stripeBilling: StripeBillingStatusDto;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatPlanLabel(value: string | null | undefined) {
  if (!value?.trim()) return "Plano sem nome";
  return value;
}

export function DashboardStripeBillingTable({
  stripeBilling,
}: DashboardStripeBillingTableProps) {
  const { connections, totals, connected } = stripeBilling;

  return (
    <Card className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex shrink-0 flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <CardTitle>Stripe Billing</CardTitle>
          <CardDescription className="max-w-xl text-xs leading-relaxed">
            Métricas por plano monitorado e totais consolidados das integrações
            Stripe conectadas.
          </CardDescription>
        </div>
        <Link
          href="/integrations"
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-fit p-0 text-xs",
          )}
        >
          Ver integrações
        </Link>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-0 py-0">
        {!connected || connections.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center px-5 text-center text-muted-foreground text-sm">
            Nenhuma integração Stripe conectada.
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <Table className="min-w-xl sm:min-w-208">
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="bg-muted hover:bg-muted!">
                  <TableHead className="min-w-48 bg-muted px-5">
                    Plano monitorado
                  </TableHead>
                  <TableHead className="w-28 bg-muted text-center">
                    Ativas
                  </TableHead>
                  <TableHead className="w-28 bg-muted text-center">
                    Clientes
                  </TableHead>
                  <TableHead className="w-36 bg-muted text-right">
                    Receita mensal
                  </TableHead>
                  <TableHead className="w-32 bg-muted text-center">
                    Pagamentos
                  </TableHead>
                  <TableHead className="w-28 bg-muted text-center">
                    Falhas
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="px-5">
                      <TruncatedTextTooltip
                        text={formatPlanLabel(connection.monitoredPlanLabel)}
                        variant="truncate"
                        className="font-medium text-foreground"
                      />
                      <p className="mt-0.5 font-mono text-muted-foreground text-xs">
                        ••••{connection.apiKeyLast4}
                      </p>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {connection.activeSubscriptionCount}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {connection.customerCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(connection.monthlyRevenueCents)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {connection.receivedPaymentCount}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {connection.failedPaymentCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {connected && connections.length > 0 ? (
        <CardFooter className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-t border-border px-5 py-3 text-xs tabular-nums">
          <span className="font-medium text-foreground">
            {totals.activeSubscriptionCount} ativas
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {totals.customerCount} clientes
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {formatCurrency(totals.monthlyRevenueCents)} receita mensal
          </span>
        </CardFooter>
      ) : null}
    </Card>
  );
}
