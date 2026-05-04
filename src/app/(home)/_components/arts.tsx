import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PillProps {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  subtitle?: string;
}

function Pill({ children, className, icon, subtitle }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[min(100%,14rem)] rounded-xl border border-border bg-card p-2.5 shadow-sm",
        className,
      )}
    >
      {!subtitle ? (
        <span className="flex items-start gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted ring-1 ring-border">
            {icon}
          </span>
          <span className="min-w-0 text-xs font-semibold leading-tight text-foreground">
            {children}
          </span>
        </span>
      ) : (
        <span className="flex items-start gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted ring-1 ring-border">
            {icon}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[10px] font-semibold leading-tight text-foreground">
              {children}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {subtitle}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

export function FeatureCardArtRocket() {
  return (
    <div className="relative mx-auto h-full min-h-[160px] w-full max-w-[280px] select-none sm:max-w-[300px] lg:absolute lg:inset-0 lg:mx-0 lg:max-w-none">
      <div className="absolute left-0 top-1 z-10">
        <Pill
          icon={
            <svg
              className="h-3.5 w-3.5 text-orange-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <title>Chama</title>
              <path d="M12 3c2 5 8 7 8 12a8 8 0 01-16 0c0-5 6-7 8-12z" />
            </svg>
          }
        >
          Lembre antes do churn
        </Pill>
      </div>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-border"
        viewBox="0 0 260 168"
        fill="none"
        aria-hidden
      >
        <title>Linha decorativa</title>
        <path
          d="M58 118 Q 120 72 188 124"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute left-[46%] top-[46%] z-1 -translate-x-1/2 -translate-y-1/2 rotate-28">
        <svg
          className="h-28 w-28 text-slate-200"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden
        >
          <title>Foguete decorativo</title>
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M32 8 L42 34 H54 L32 56 L10 34 H22 Z"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M32 56 V62"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            d="M22 38 L14 46 M42 38 L50 46"
          />
        </svg>
      </div>
      <div className="absolute bottom-2 right-0 z-10 max-w-44">
        <Pill
          icon={
            <svg
              className="h-3.5 w-3.5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <title>Renovação</title>
              <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3l2 7h6l-8 11-8-11h6l2-7z"
              />
            </svg>
          }
        >
          Recupere antes de perder a assinatura
        </Pill>
      </div>
    </div>
  );
}

interface MockRowProps {
  tone: "success" | "danger";
  label: string;
  time: string;
  icon: ReactNode;
}

interface FlowNodeProps {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  subtitle?: string;
  tone?: "neutral" | "primary" | "success" | "danger";
}

const toneStyles = {
  neutral: "bg-muted text-muted-foreground ring-border",
  primary: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  danger: "bg-rose-50 text-rose-500 ring-rose-200",
} as const;

function FlowNode({
  children,
  className,
  icon,
  subtitle,
  tone = "neutral",
}: FlowNodeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-2.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl ring-1",
            toneStyles[tone],
          )}
        >
          {icon}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-semibold leading-tight text-foreground">
            {children}
          </span>
          {subtitle ? (
            <span className="text-[9px] leading-tight text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function PendingUserIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>Pending user</title>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M2 21v-2a4 4 0 014-4h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="17" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M17 15v2l1.5 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AutomationHubIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>Automation hub</title>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserCheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>User approved</title>
      <path
        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16.5 11.5l2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserRemoveIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>User removed</title>
      <path
        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M18 9l4 4M22 9l-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MockRow({ tone, label, time, icon }: MockRowProps) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
      : "border-rose-200 bg-rose-50 text-rose-500";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-2.5 py-2",
        styles,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-border">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold leading-tight text-foreground">
          {label}
        </p>
        <p className="text-[9px] text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

export function FeatureCardArtReliability() {
  return (
    <div className="flex h-full select-none flex-col justify-center gap-2.5 pr-1 sm:absolute sm:inset-0">
      <MockRow
        tone="success"
        label="Acesso liberado"
        time="Webhook confirmado · há 12 s"
        icon={
          <svg
            className="h-4 w-4 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <title>Concedido</title>
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
      <MockRow
        tone="danger"
        label="Acesso revogado"
        time="Assinatura expirada · há 4 min"
        icon={
          <svg
            className="h-4 w-4 text-rose-500"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <title>Revogado</title>
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        }
      />
      <MockRow
        tone="success"
        label="Regra aplicada"
        time="Sincronizado com o Telegram · agora"
        icon={
          <svg
            className="h-4 w-4 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <title>Sincronizado</title>
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
    </div>
  );
}

export function FeatureCardArtSetup() {
  return (
    <div className="flex h-full select-none flex-col justify-center gap-3 px-1 sm:absolute sm:inset-0 sm:px-2">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/60 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-foreground">
            Automação do grupo
          </span>
          <span className="text-[9px] text-muted-foreground">
            Liga em um clique
          </span>
        </div>
        <span
          aria-hidden
          className="relative h-6 w-11 rounded-full bg-emerald-500 shadow-sm ring-1 ring-emerald-400/40"
        >
          <span className="absolute right-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm" />
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {[
          {
            n: "1",
            t: "Conecte seu gateway de pagamento",
            d: "Stripe, Pagarme…",
          },
          {
            n: "2",
            t: "Vincule o bot ao Telegram",
            d: "Token e grupo prontos",
          },
          { n: "3", t: "Publique as regras", d: "Liberação automática" },
        ].map((step) => (
          <li
            key={step.n}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-2.5 py-2"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary ring-1 ring-primary/20">
              {step.n}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[10px] font-semibold leading-tight text-foreground">
                {step.t}
              </p>
              <p className="text-[9px] text-muted-foreground">{step.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FeatureCardArtMembersFlow() {
  return (
    <div className="relative mx-auto h-[168px] w-full max-w-[360px] select-none overflow-hidden sm:max-w-[400px] lg:absolute lg:inset-0 lg:h-full lg:max-w-none lg:min-h-[168px]">
      <p className="text-black">fazer depois com dashboard</p>
    </div>
  );
}
