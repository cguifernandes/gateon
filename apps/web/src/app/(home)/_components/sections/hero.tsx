"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useId, useRef } from "react";
import { Container } from "@/components/container";
import {
  ArrowUpRightIcon,
  type ArrowUpRightIconHandle,
} from "@/components/icons/arrow-up-right";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ImageTelegram from "../../../../app/hero-telegram-iphone.png";

const floatTransition = {
  duration: 4.5,
  repeat: Number.POSITIVE_INFINITY,
  ease: "easeInOut" as const,
};

function HeroIllustration() {
  return (
    <div className="relative w-2xl md:w-xl overflow-visible" aria-hidden>
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
              <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                <stop
                  offset="100%"
                  stopColor="currentColor"
                  stopOpacity="0.5"
                />
              </linearGradient>

              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            <path
              d="M235 65 C235 95 225 120 205 145"
              stroke="url(#hero-line)"
              strokeWidth="1.5"
              fill="none"
              markerEnd="url(#arrow)"
            />
            <path
              d="M110 305 C120 280 130 250 150 215"
              stroke="url(#hero-line)"
              strokeWidth="1.5"
              fill="none"
              markerEnd="url(#arrow)"
            />
            <path
              d="M215 320 C220 300 220 285 205 255"
              stroke="url(#hero-line)"
              strokeWidth="1.5"
              fill="none"
              markerEnd="url(#arrow)"
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
            className="hidden xl:block absolute w-fit -left-24 bottom-28 z-20 rounded-2xl p-2.5 border border-border bg-card shadow-sm"
            animate={{ y: [0, -6, 0] }}
            transition={{ ...floatTransition, delay: 0.2 }}
          >
            <div className="min-w-0 flex gap-y-1 flex-col">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                Novo membro
              </span>
              <p className="font-bold tabular-nums text-foreground text-sm">
                João entrou agora
              </p>
              <p className="text-[10px] text-emerald-500">
                Grupo liberado automaticamente
              </p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ ...floatTransition, delay: 0.4 }}
            className="hidden xl:block absolute -bottom-3 -right-28 z-30 w-52 rounded-2xl border border-border bg-card shadow-sm p-2.5 sm:w-56"
          >
            <div className="flex flex-col gap-y-1">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                Automação
              </p>

              <p className="text-[11px] font-semibold">
                Fluxo executado automaticamente
              </p>

              <p className="text-[10px] text-muted-foreground">
                Pagamento → Webhook → Grupo liberado
              </p>
            </div>
          </motion.div>

          <motion.div
            className="hidden xl:block absolute -top-2 h-fit -right-24 z-20 w-[min(100%,9rem)] rounded-2xl border border-border bg-card shadow-sm p-2.5 sm:bottom-32 sm:w-auto sm:max-w-52"
            animate={{ y: [0, 7, 0] }}
            transition={{ ...floatTransition, delay: 0.8 }}
          >
            <div className="flex items-center max-w-44 gap-2">
              <CircleCheckIcon
                isAnimateOnView
                size={20}
                className="text-emerald-500"
              />

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold leading-tight text-foreground">
                  Stripe confirmou o pagamento.
                </p>
                <span className="text-[10px] text-emerald-500">
                  Acesso liberado em segundos.
                </span>
              </div>
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

              <div className="relative z-10 rounded-[2.15rem] bg-linear-to-b from-zinc-700 via-zinc-900 to-zinc-950 p-1.5 ring-1 ring-inset ring-white/15 sm:p-2">
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
              </div>
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
    <section className="py-20 md:py-24" id={useId()}>
      <Container>
        <div className="flex flex-col gap-16 lg:flex-row items-center lg:justify-between">
          <div className="lg:max-w-lg max-w-xl flex flex-col lg:items-start items-center gap-y-4">
            <Badge>Cobranças 100% automatizadas</Badge>
            <h1 className="text-3xl font-extrabold lg:text-start text-center leading-[1.08] tracking-tight text-foreground sm:text-4xl sm:leading-[1.06] lg:text-5xl lg:leading-[1.05]">
              Automatize sua Receita Recorrente no Telegram.
            </h1>
            <p className="text-base lg:text-start text-center font-light text-muted-foreground">
              Cobranças, acesso a grupos e retenção em um só fluxo. Menos
              planilhas, mais previsibilidade. Integrado com os gateways que
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
              Começar Gratuitamente
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
