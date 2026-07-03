import type { ComponentType } from "react";
import { Container } from "@/components/container";
import {
  FeatureCardArtMembersFlow,
  FeatureCardArtReliability,
  FeatureCardArtRocket,
  FeatureCardArtSetup,
} from "../arts";
import { FeatureCardArtSalesGrowth } from "../charts/art-sales-growth";
import { FeatureCard } from "../feature-card";

type FeatureItem = {
  title: string;
  desc: string;
  layout: "split" | "stack";
  Art: ComponentType;
};

type FeatureColumn = {
  items: FeatureItem[];
  flex: string;
};

type FeatureRow = {
  id: string;
  columns: (FeatureColumn & { id: string })[];
};

const featureRows: FeatureRow[] = [
  {
    id: "row-top",
    columns: [
      {
        id: "col-left",
        flex: "lg:basis-[60%]",
        items: [
          {
            title: "Controle total dos membros",
            desc: "O acesso ao seu grupo é concedido ou revogado automaticamente conforme o status de cada pagamento no Stripe. Sem aprovação manual, sem erro humano — cada membro sempre com o acesso exatamente no estado que deveria estar.",
            layout: "split",
            Art: FeatureCardArtMembersFlow,
          },
          {
            title: "Recupere assinaturas automaticamente",
            desc: "Antes que um atraso vire cancelamento, o Gateon entra em ação: envia um lembrete personalizado no Telegram no momento ideal. Você recupera receita sem precisar acompanhar cada renovação manualmente.",
            layout: "split",
            Art: FeatureCardArtRocket,
          },
        ],
      },
      {
        id: "col-right",
        flex: "lg:basis-[40%]",
        items: [
          {
            title: "Reduza suporte manual",
            desc: 'Liberações, remoções e renovações acontecem sem intervenção sua via webhook Stripe. Elimine a fila de mensagens do tipo "já paguei, me adiciona" e libere seu tempo para o que realmente importa: crescer o negócio.',
            layout: "stack",
            Art: FeatureCardArtSalesGrowth,
          },
        ],
      },
    ],
  },
  {
    id: "row-bottom",
    columns: [
      {
        id: "col-left",
        flex: "lg:basis-[40%]",
        items: [
          {
            title: "Automação confiável",
            desc: "Cada evento do Stripe dispara uma ação precisa e auditável. O Gateon processa liberações e revogações com consistência total, independente do volume — sem atrasos, sem falhas silenciosas.",
            layout: "split",
            Art: FeatureCardArtReliability,
          },
        ],
      },
      {
        id: "col-right",
        flex: "lg:basis-[60%]",
        items: [
          {
            title: "Comece em minutos",
            desc: "Conecte sua conta Stripe, vincule o bot ao grupo do Telegram e defina as regras de acesso. Sem código, sem configurações complexas — em poucos passos sua operação já está rodando no piloto automático.",
            layout: "split",
            Art: FeatureCardArtSetup,
          },
        ],
      },
    ],
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-white py-16 md:py-20" id="criadores">
      <Container>
        <div className="flex flex-col gap-4 md:gap-6">
          {featureRows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-stretch"
            >
              {row.columns.map((col) => (
                <div
                  key={`${row.id}-${col.id}`}
                  className={`flex min-w-0 flex-1 flex-col gap-4 md:gap-6 ${col.flex}`}
                >
                  {col.items.map((item) => {
                    const Art = item.Art;
                    return (
                      <FeatureCard
                        key={item.title}
                        title={item.title}
                        description={item.desc}
                        layout={item.layout}
                        className="h-full min-h-[300px] lg:min-h-[320px]"
                      >
                        <Art />
                      </FeatureCard>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
