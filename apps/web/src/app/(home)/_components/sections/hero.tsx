"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  ArrowUpRightIcon,
  type ArrowUpRightIconHandle,
} from "@/components/icons/arrow-up-right";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import { MessageCircleIcon } from "@/components/icons/message-circle";
import { RefreshCWIcon } from "@/components/icons/refresh-cw";
import { UsersIcon } from "@/components/icons/users";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ImageTelegram from "../../../../../public/hero-telegram-iphone.png";
import { Container } from "../../../../components/container";

const floatTransition = {
  duration: 4.5,
  repeat: Number.POSITIVE_INFINITY,
  ease: "easeInOut" as const,
};

function HeroIllustration() {
  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-visible lg:max-w-none"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-6 top-8 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-8 bottom-12 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-dim/50 blur-2xl" />
      </div>

      <div className="relative flex min-h-104 w-full justify-center overflow-visible p-4 sm:min-h-120 sm:p-6">
        <div className="relative aspect-320/440 w-[min(280px,calc(100vw-2rem))] shrink-0 sm:w-[320px]">
          <svg
            className="pointer-events-none absolute inset-0 z-4 h-full w-full text-primary/40"
            viewBox="0 0 320 440"
            fill="none"
            aria-hidden
            preserveAspectRatio="xMidYMid meet"
          >
            <title>Linhas decorativas entre os cards e o celular</title>
            <defs>
              <linearGradient
                id="hero-connector"
                gradientUnits="userSpaceOnUse"
                x1="40"
                y1="40"
                x2="280"
                y2="380"
              >
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                <stop
                  offset="100%"
                  stopColor="currentColor"
                  stopOpacity="0.42"
                />
              </linearGradient>
            </defs>
            {/* Comunidade (bottom-left) → phone left */}
            <path
              d="M 118 302 Q 108 262 100 220"
              stroke="url(#hero-connector)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Novo assinante (top-right) → phone upper-right */}
            <path
              d="M 198 54 Q 208 95 220 136"
              stroke="url(#hero-connector)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Automação (bottom-right) → phone lower-right */}
            <path
              d="M 206 328 Q 212 298 222 288"
              stroke="url(#hero-connector)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="100"
              cy="220"
              r="2.5"
              fill="currentColor"
              opacity="0.35"
            />
            <circle
              cx="220"
              cy="136"
              r="2.5"
              fill="currentColor"
              opacity="0.35"
            />
            <circle
              cx="222"
              cy="288"
              r="2.5"
              fill="currentColor"
              opacity="0.35"
            />
          </svg>

          <motion.div
            className="absolute -left-50 bottom-28 z-20 w-52 rounded-2xl border border-border bg-card shadow-sm sm:w-56"
            animate={{ y: [0, -6, 0] }}
            transition={{ ...floatTransition, delay: 0.2 }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2 p-2.5 pb-0">
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Comunidade
                  </span>
                  <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">
                    248
                  </p>
                  <p className="text-[10px] leading-tight text-muted-foreground">
                    membros com acesso ativo
                  </p>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12">
                  <UsersIcon
                    isAnimateOnView
                    size={16}
                    className="text-primary"
                  />
                </div>
              </div>
              <div className="border-t border-border p-2.5">
                <p className="text-[10px] leading-snug text-muted-foreground">
                  <span className="font-medium text-emerald-600">
                    +3 esta semana
                  </span>{" "}
                  após a confirmação do pagamento
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ ...floatTransition, delay: 0.4 }}
            className="absolute -bottom-3 -right-48 z-30 w-52 rounded-2xl border border-border bg-card shadow-sm p-2.5 sm:w-56"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Automação
                </p>
                <p className="mt-0.5 text-xs font-bold leading-snug text-foreground">
                  Cobrança e acesso no mesmo ritmo
                </p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12">
                <RefreshCWIcon
                  isAnimateOnView
                  size={16}
                  className="text-primary"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute -top-2 h-fit -right-30 z-20 w-[min(100%,11rem)] rounded-2xl border border-border bg-card shadow-sm p-2.5 sm:bottom-32 sm:w-auto sm:max-w-52"
            animate={{ y: [0, 7, 0] }}
            transition={{ ...floatTransition, delay: 0.8 }}
          >
            <div className="flex items-start gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/15">
                <MessageCircleIcon
                  isAnimateOnView
                  size={12}
                  className="text-primary"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold leading-tight text-foreground">
                  Novo assinante
                </p>
                <p className="text-[9px] text-muted-foreground">há 2 min</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[9px] text-emerald-700">
              <CircleCheckIcon isAnimateOnView size={12} className="shrink-0" />
              Acesso ao grupo liberado
            </div>
          </motion.div>

          <div className="absolute top-1/2 left-1/2 z-10 w-45 -translate-x-1/2 -translate-y-1/2 sm:w-54">
            <div className="relative mx-auto rounded-[2.15rem] shadow-2xl shadow-zinc-900/35">
              <div
                className="pointer-events-none absolute -inset-8 z-0 rounded-[3rem] bg-primary/40 blur-3xl sm:-inset-4 sm:blur-2xl"
                aria-hidden
              />
              <div
                className="absolute top-[16%] -left-px z-10 h-7 w-[3px] rounded-l-sm bg-zinc-600/95 sm:top-[17%] sm:h-8"
                aria-hidden
              />
              <div
                className="absolute top-[24%] -left-px z-10 h-14 w-[3px] rounded-l-sm bg-zinc-600/95"
                aria-hidden
              />
              <div
                className="absolute top-[21%] -right-px z-10 h-18 w-[3px] rounded-r-sm bg-zinc-600/95"
                aria-hidden
              />

              <motion.div
                animate={{ y: [0, 7, 0] }}
                transition={{ ...floatTransition, delay: 0.2 }}
                className="relative z-10 rounded-[2.15rem] bg-linear-to-b from-zinc-700 via-zinc-900 to-zinc-950 p-1.5 ring-1 ring-inset ring-white/15 sm:p-2"
              >
                <div className="relative overflow-hidden rounded-[1.85rem] bg-black ring-1 ring-black/60">
                  <div className="relative aspect-[9/19.3] w-full">
                    <Image
                      src={ImageTelegram}
                      alt=""
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 78vw, 216px"
                      priority
                      quality={100}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const arrowUpRightIcon = useRef<ArrowUpRightIconHandle>(null);

  return (
    <section className="py-20 md:py-24" id="start">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="max-w-md flex flex-col gap-4">
            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-4xl sm:leading-[1.06] lg:text-5xl lg:leading-[1.05]">
              Automatize sua Receita Recorrente no Telegram.
            </h1>
            <p className="text-base font-light text-muted-foreground">
              Cobranças, acesso a grupos e retenção em um só fluxo. Menos
              planilhas, mais previsibilidade — integrado com os gateways que
              você utiliza no dia a dia.
            </p>
            <Link
              href="#pricing"
              onMouseEnter={() => arrowUpRightIcon.current?.startAnimation()}
              onMouseLeave={() => arrowUpRightIcon.current?.stopAnimation()}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "group h-12 w-fit gap-3 rounded-full pl-6 pr-2 shadow-lg",
              )}
            >
              <span>Começar Gratuitamente</span>
              <span className="ml-0 flex size-8 items-center justify-center rounded-full bg-white text-slate-900">
                <ArrowUpRightIcon ref={arrowUpRightIcon} />
              </span>
            </Link>
          </div>
          <HeroIllustration />
        </div>
      </Container>
    </section>
  );
}
