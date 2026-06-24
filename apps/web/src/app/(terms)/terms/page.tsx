import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMAIL_SUPPORT } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Termos — Gateon",
  description: "Termos de uso e condições do serviço Gateon.",
};

const termsSections = [
  {
    title: "Uso do serviço",
    items: [
      "O Gateon automatiza acesso a grupos conectados e não processa pagamentos diretamente.",
      "O usuário é responsável por configurar corretamente permissões do bot, integrações e regras dos seus grupos.",
      "É proibido usar o serviço para spam, fraude, violação de direitos ou tratamento ilegal de dados pessoais.",
    ],
  },
  {
    title: "Integrações externas",
    items: [
      "A disponibilidade de recursos pode depender de APIs de terceiros, como Telegram, provedores OAuth e gateways conectados.",
      "Credenciais de integrações devem usar o menor privilégio possível e não devem ser compartilhadas fora da plataforma.",
      "Alterações ou indisponibilidades de terceiros podem afetar automações em execução.",
    ],
  },
  {
    title: "Dados e segurança",
    items: [
      "O usuário deve informar titulares sobre o tratamento de dados realizado nos grupos administrados.",
      "O Gateon aplica controles técnicos para autenticação, sessão, auditoria e redução de exposição de dados.",
      "Incidentes, suspeitas de abuso ou solicitações legais devem ser comunicados pelo canal de suporte.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="space-y-8 pb-10!">
      <div className="space-y-2">
        <h1 className="font-heading font-semibold text-3xl tracking-tight">
          Termos de uso
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Estes termos descrevem responsabilidades básicas para uso do Gateon em
          automações de acesso por assinatura.
        </p>
      </div>

      <div className="grid gap-4">
        {termsSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground text-sm leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm leading-relaxed">
          Dúvidas sobre estes termos podem ser enviadas para{" "}
          <a
            href={`mailto:${EMAIL_SUPPORT}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {EMAIL_SUPPORT}
          </a>
          .
        </CardContent>
      </Card>
    </div>
  );
}
