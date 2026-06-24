import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMAIL_SUPPORT } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacidade — Gateon",
  description:
    "Política de privacidade, cookies e direitos do titular de dados no Gateon.",
};

const privacySections = [
  {
    title: "Dados coletados",
    items: [
      "Dados de conta: nome, e-mail, foto de perfil e status de verificação quando informado pelo provedor de login.",
      "Dados operacionais do Telegram: grupos conectados, identificadores de chat, membros, nomes públicos e fotos retornadas pela API do Telegram.",
      "Dados técnicos: hashes de IP, hashes de user-agent, eventos de sessão, preferências de interface e registros mínimos para segurança.",
    ],
  },
  {
    title: "Finalidade e base legal",
    items: [
      "Executar o serviço contratado, autenticar usuários e gerenciar acesso aos grupos conectados.",
      "Proteger contas, prevenir abuso, manter auditoria técnica e cumprir obrigações legais aplicáveis.",
      "Usar cookies opcionais somente após consentimento explícito.",
    ],
  },
  {
    title: "Retenção e exclusão",
    items: [
      "Sessões expiram conforme a configuração do ambiente e metadados técnicos são mantidos por prazo limitado.",
      "Dados de grupos e membros devem ser removidos quando a conexão com o grupo ou a conta for excluída.",
      "O titular pode solicitar exclusão, correção ou exportação dos dados pelo canal de suporte.",
    ],
  },
  {
    title: "Compartilhamento",
    items: [
      "O Gateon se comunica com APIs externas necessárias ao serviço, como Telegram e provedores OAuth.",
      "Chaves e tokens de integrações não devem ser expostos em logs nem compartilhados com terceiros fora da execução do serviço.",
      "Não vendemos dados pessoais.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-8 pb-10!">
      <div className="space-y-2">
        <h1 className="font-heading font-semibold text-3xl tracking-tight">
          Política de privacidade
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Esta página resume como o Gateon trata dados pessoais para automação
          de acesso a grupos, segurança da conta e comunicação com integrações
          externas.
        </p>
      </div>

      <div className="grid gap-4">
        {privacySections.map((section) => (
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
          <CardTitle>Direitos do titular</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção,
            portabilidade, anonimização, revogação de consentimento ou exclusão
            dos seus dados pessoais.
          </p>
          <p>
            Envie sua solicitação para{" "}
            <a
              href={`mailto:${EMAIL_SUPPORT}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {EMAIL_SUPPORT}
            </a>
            . Solicitações podem exigir validação de identidade antes da
            execução.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
