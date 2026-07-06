"use client";

import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn, EMAIL_SUPPORT } from "@/lib/utils";

const faqs = [
  {
    q: "Posso começar gratuitamente?",
    a: "Sim. O plano Gratuito permite conectar 1 grupo, gerenciar até 75 membros e testar as principais funcionalidades antes de fazer um upgrade.",
  },
  {
    q: "Posso mudar de plano quando quiser?",
    a: "Sim. Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, conforme o crescimento da sua comunidade.",
  },
  {
    q: "O que acontece quando um membro deixa de pagar?",
    a: "O Gateon recebe a atualização do gateway em tempo real e remove automaticamente o membro do grupo quando a assinatura expira ou é cancelada, de acordo com seu plano.",
  },
  {
    q: "Posso gerenciar vários grupos?",
    a: "Sim. A quantidade de grupos e o limite de membros por grupo dependem do plano contratado. Você pode fazer upgrade sempre que precisar de mais capacidade.",
  },
  {
    q: "Tenho que pagar taxas sobre minhas vendas?",

    a: "Não. O Gateon cobra apenas a assinatura da plataforma. As taxas do gateway de pagamento continuam sendo cobradas diretamente pelo provedor escolhido.",
  },
  {
    q: "O acesso ao grupo é liberado automaticamente?",

    a: "Sim. Assim que o pagamento é confirmado pelo gateway, o Gateon envia automaticamente o convite para o cliente entrar no grupo privado.",
  },
  {
    q: "Preciso adicionar um bot ao meu grupo?",

    a: "Sim. Basta adicionar o bot do Gateon como administrador do grupo e conceder as permissões necessárias para gerenciar os membros.",
  },
];

export function FaqSection() {
  return (
    <section className="py-16 scroll-mt-24 md:py-20" id="faq">
      <Container className="flex flex-col gap-y-12 items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground">
            Perguntas Frequentes
          </h2>
        </div>
        <Accordion defaultValue={["faq-0"]} className="space-y-2 max-w-2xl">
          {faqs.map((item, i) => (
            <AccordionItem className="bg-white" key={item.q} value={`faq-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-muted flex flex-col gap-3 items-center px-6 py-5 text-center">
          <p className="text-sm font-light text-muted-foreground">
            Não encontrou a resposta que procurava?
          </p>

          <a
            href={`mailto:${EMAIL_SUPPORT}`}
            className={cn(
              buttonVariants({ variant: "link" }),
              "h-fit w-fit p-0",
            )}
          >
            Fale com o suporte
          </a>
        </div>
      </Container>
    </section>
  );
}
