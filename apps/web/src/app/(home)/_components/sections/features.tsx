import type { ComponentType } from "react";
import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import {
  FeatureCardArtEvents,
  FeatureCardArtMembersTable,
  FeatureCardArtSetup,
} from "../arts";
import { FeatureCard } from "../feature-card";

type FeatureItem = {
  title: string;
  desc: string;
  layout: "split" | "stack";
  Art?: ComponentType;
  className?: string;
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
            desc: "Gerencie automaticamente quem entra ou sai dos seus grupos no Telegram. O acesso é liberado após a confirmação do pagamento e revogado quando a assinatura é cancelada.",
            layout: "split",
          },
          {
            title: "Recupere assinaturas automaticamente",
            desc: "Envie lembretes automáticos no Telegram antes da renovação da assinatura para incentivar a atualização do pagamento, reduzir cancelamentos involuntários.",
            layout: "split",
          },
        ],
      },
      {
        id: "col-right",
        flex: "lg:basis-[40%] h-full",
        items: [
          {
            title: "Conectar seu grupo é simples",
            desc: "Em poucos passos, seu grupo estará conectado e automatizado.",
            layout: "stack",
            Art: FeatureCardArtSetup,
            className: "h-full static",
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
            title: "Nunca perca um evento importante",
            desc: "Receba alertas automáticos das principais automações.",
            layout: "split",
            Art: FeatureCardArtEvents,
            className: "h-full static",
          },
        ],
      },
      {
        id: "col-right",
        flex: "lg:basis-[60%]",
        items: [
          {
            title: "Acompanhe tudo em tempo real",
            desc: "Visualize membros ativos, acessos liberados, remoções automáticas e métricas da sua comunidade.",
            layout: "split",
            Art: FeatureCardArtMembersTable,
            className: "relative h-96 lg:h-full",
          },
        ],
      },
    ],
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-white scroll-mt-24 py-16 md:py-20" id="criadores">
      <Container>
        <div className="flex flex-col gap-4 md:gap-6">
          {featureRows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-4 md:gap-6 lg:flex-row"
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
                        className={cn(
                          "relative h-full overflow-hidden",
                          item.className,
                        )}
                      >
                        {Art && <Art />}
                      </FeatureCard>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}{" "}
        </div>
      </Container>
    </section>
  );
}
