import Link from "next/link";
import { Container } from "@/components/container";
import { ArrowUpRightIcon } from "@/components/icons/arrow-up-right";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaSection() {
  return (
    <section className="border-t border-border/60 bg-white py-16 md:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-blue-700 px-6 py-16 text-center shadow-xl shadow-primary/20 sm:px-12 md:py-20">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden
          >
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-blue-300/20 blur-3xl" />
          </div>

          <h2 className="text-2xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-3xl md:text-4xl">
            Pronto para automatizar sua receita?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base font-light text-white/80">
            Conecte seu Stripe, vincule ao Telegram e comece em minutos. Sem
            código, sem complicação.
          </p>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "mt-8 inline-flex h-12 gap-3 rounded-full bg-white pl-6 pr-2 text-primary shadow-lg hover:bg-white/90",
            )}
          >
            <span>Começar Gratuitamente</span>
            <span className="ml-0 flex size-8 items-center justify-center rounded-full bg-primary text-white">
              <ArrowUpRightIcon />
            </span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
