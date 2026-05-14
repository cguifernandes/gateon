import {
  Activity,
  Bell,
  Bot,
  CreditCard,
  Gauge,
  LockKeyhole,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  userName?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
};

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "neutral";
};

type SetupStep = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const metricCards: MetricCardProps[] = [
  {
    title: "Comunidade",
    value: "A configurar",
    description: "Conecte um grupo para iniciar a gestão de membros.",
    icon: Users,
    tone: "primary",
  },
  {
    title: "Assinantes",
    value: "Sem dados",
    description: "As métricas aparecem após conectar o gateway.",
    icon: Activity,
    tone: "success",
  },
  {
    title: "Gateway",
    value: "Não conectado",
    description: "Adicione uma chave de leitura para sincronizar assinaturas.",
    icon: CreditCard,
    tone: "warning",
  },
  {
    title: "Automação",
    value: "Pendente",
    description: "Configure regras antes de liberar remoções automáticas.",
    icon: Bot,
    tone: "neutral",
  },
];

const setupSteps: SetupStep[] = [
  {
    title: "Conecte o grupo",
    description: "Informe o ID do grupo e confirme o bot como administrador.",
    icon: Users,
  },
  {
    title: "Integre o gateway",
    description: "Use uma chave somente leitura para importar status ativos.",
    icon: CreditCard,
  },
  {
    title: "Defina mensagens",
    description: "Prepare avisos de vencimento, pagamento e remoção.",
    icon: MessageCircle,
  },
];

const automationRules = [
  "Aviso antes do vencimento",
  "Remoção de assinatura vencida",
  "Confirmação de pagamento",
  "Log de ações críticas",
];

const AUTOMATION_SECTION_ID = "automation";
const INTEGRATIONS_SECTION_ID = "integrations";

const toneStyles = {
  primary: "bg-primary/12 text-primary ring-primary/20",
  success: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  warning: "bg-amber-50 text-amber-600 ring-amber-200",
  neutral: "bg-muted text-muted-foreground ring-border",
} as const;

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <Card className="rounded-3xl border-border/80 bg-card/95 py-0">
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
          </div>
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1",
              toneStyles[tone],
            )}
          >
            <Icon className="size-5" />
          </span>
        </div>
        <p className="mt-auto text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function AccessChart() {
  return (
    <Card
      className="rounded-[2rem] border-border/80 bg-card/95 py-0"
      id={AUTOMATION_SECTION_ID}
    >
      <CardHeader className="gap-2 p-6 pb-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Acesso do grupo</CardTitle>
            <CardDescription>
              Acompanhe liberações, renovações e remoções quando as integrações
              estiverem ativas.
            </CardDescription>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-amber-400" />
            Aguardando configuração
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative min-h-72 overflow-hidden rounded-3xl border border-border bg-linear-to-b from-surface-container to-background p-5">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary)/0.12,transparent_35%)]"
            aria-hidden
          />
          <div className="relative grid h-full gap-6 lg:grid-cols-[1fr_15rem]">
            <div className="flex min-h-52 flex-col justify-between">
              <div className="grid grid-cols-3 gap-3">
                {["Ativos", "Pendentes", "Removidos"].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground">0</p>
                  </div>
                ))}
              </div>

              <div className="relative mt-6 h-40 overflow-hidden rounded-2xl border border-border bg-background/70 p-4">
                <div className="absolute inset-x-4 top-1/4 border-t border-dashed border-border" />
                <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-border" />
                <div className="absolute inset-x-4 top-3/4 border-t border-dashed border-border" />
                <svg
                  className="relative h-full w-full text-primary"
                  viewBox="0 0 420 130"
                  fill="none"
                  aria-hidden
                >
                  <title>Linha de evolução sem dados reais</title>
                  <path
                    d="M8 102 C70 98 92 82 132 86 C182 92 194 54 242 60 C292 66 306 34 358 42 C386 46 402 36 414 30"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.26"
                  />
                  <path
                    d="M8 102 C70 98 92 82 132 86 C182 92 194 54 242 60 C292 66 306 34 358 42 C386 46 402 36 414 30"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="8 8"
                  />
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Gauge className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">
                      Pronto para escala
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cards preparados para dados reais.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-sm font-semibold text-foreground">
                  Status da operação
                </p>
                <div className="mt-4 space-y-3">
                  {automationRules.map((rule) => (
                    <div key={rule} className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-muted-foreground/35" />
                      <span className="text-sm text-muted-foreground">
                        {rule}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SetupCard({ title, description, icon: Icon }: SetupStep) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function AssistantPanel() {
  return (
    <Card className="rounded-[2rem] border-border/80 bg-card/95 py-0">
      <CardHeader className="p-5 pb-0">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Bell className="size-4" />
          </span>
          Próximas ações
        </CardTitle>
        <CardDescription>
          Complete a configuração para ativar a operação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {setupSteps.map((step) => (
          <SetupCard key={step.title} {...step} />
        ))}
      </CardContent>
    </Card>
  );
}

function AccountCard({ email, emailVerified }: DashboardOverviewProps) {
  return (
    <Card className="rounded-[2rem] border-border/80 bg-card/95 py-0">
      <CardHeader className="p-5 pb-0">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <ShieldCheck className="size-4" />
          </span>
          Conta
        </CardTitle>
        <CardDescription>Dados da sessão atual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="rounded-3xl border border-border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            E-mail
          </p>
          <p className="mt-1 break-all text-sm font-semibold text-foreground">
            {email ?? "Não informado"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-background p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Verificação</p>
            <p className="text-xs text-muted-foreground">
              Necessária para proteger a conta.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
              emailVerified
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            {emailVerified ? "Verificado" : "Pendente"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardOverview({
  userName,
  email,
  emailVerified,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <LockKeyhole className="size-3.5 text-primary" />
              Painel seguro
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Olá{userName ? `, ${userName}` : ""}. Vamos configurar sua
              operação.
            </h1>
            <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-muted-foreground">
              Seu dashboard está pronto para centralizar grupo, gateway,
              assinantes e automações assim que as integrações forem conectadas.
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-3 rounded-3xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur-sm">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Settings2 className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Configuração inicial
              </p>
              <p className="text-sm text-muted-foreground">
                3 etapas para ativar a automação.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <section
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]"
        id={INTEGRATIONS_SECTION_ID}
      >
        <AccessChart />
        <div className="space-y-6">
          <AssistantPanel />
          <AccountCard email={email} emailVerified={emailVerified} />
        </div>
      </section>
    </div>
  );
}
