"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container } from "../container";

const faqs = [
  {
    q: "Tenho que pagar taxas extras?",
    a: "A assinatura do produto é separada das taxas do seu provedor de pagamento (ex.: Stripe, Pagar.me). Não cobramos percentual sobre faturamento além do seu plano.",
  },
  {
    q: "Minha conta está segura?",
    a: "Utilizamos boas práticas de credenciais, rotação de chaves e tráfego criptografado. Você controla o que fica conectado e pode revogar a qualquer momento.",
  },
  {
    q: "Preciso saber programar?",
    a: "Não. A interface guia a configuração. APIs avançadas existem se o seu time quiser customizar no futuro.",
  },
] as const;

export function FaqSection() {
  return (
    <section className="py-16 md:py-20" id="documentation">
      <Container>
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Perguntas <span className="text-primary">Frequentes</span>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Respostas diretas. Se faltar alguma, fale com o suporte.
            </p>
          </div>
          <Accordion
            defaultValue={["faq-0"]}
            className="space-y-2 rounded-xl border border-border bg-card p-1"
          >
            {faqs.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`faq-${i}`}
                className="rounded-lg border-0 border-b border-border px-3 last:border-b-0 last:pb-0 not-last:pb-0"
              >
                <AccordionTrigger className="py-3 text-foreground">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-3 text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-6 text-center">
            <Link
              href="#support"
              className={cn(
                buttonVariants({ variant: "link" }),
                "text-sm font-semibold",
              )}
            >
              Saiba mais
            </Link>
          </p>
        </div>
      </Container>
    </section>
  );
}
