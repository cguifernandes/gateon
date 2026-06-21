import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const monitoredData = [
  "ID numérico do Telegram (para vincular assinatura ao membro do grupo)",
  "Nome e e-mail do cliente na Stripe (quando disponíveis na sincronização)",
  "Status da assinatura e data de vencimento",
  "Status de pagamento e plano contratado",
];

const blockedData = [
  "Senhas, dados de cartão e informações bancárias",
  "CPF e documentos pessoais",
  "Conteúdo de mensagens privadas além do necessário para o serviço",
  "Dados financeiros sensíveis além do necessário para o monitoramento",
];

const creatorSteps = [
  "Conecte a Stripe aqui em Integrações, selecione o plano e vincule o grupo de destino.",
  "Em Configurações, ative os botões de pagamento no /start para os planos desejados.",
  "Compartilhe seu link exclusivo do bot (t.me/...?start=g_...) no privado com quem deve assinar.",
  "O Gateon passa a contabilizar assinantes vinculados após cada pagamento confirmado na Stripe.",
];

const stripePaymentGroupLimitsByPlan = [
  { plan: "Gratuito", maxGroups: 1 },
  { plan: "Starter", maxGroups: 5 },
  { plan: "Pro", maxGroups: 100 },
];

const customerSteps = [
  "Abrir o link do criador no chat privado com o bot do Gateon e tocar em Iniciar.",
  "Ler a mensagem de boas-vindas e tocar no botão do plano desejado.",
  "Concluir o pagamento na página oficial da Stripe (cartão e dados sensíveis ficam só com a Stripe).",
  "Voltar ao Telegram: o bot envia o link de convite do grupo após a confirmação do pagamento.",
  "Pronto — o perfil do Telegram fica vinculado à assinatura na Stripe para controle de acesso ao grupo.",
];

const botActions = [
  "Identificar o visitante pelo ID numérico do Telegram (fornecido pela própria plataforma ao iniciar o chat).",
  "Gerar link de checkout da Stripe apenas para o plano escolhido, sem armazenar cartão ou senha.",
  "Consultar na Stripe se o pagamento foi concluído e registrar o vínculo assinatura ↔ Telegram.",
  "Enviar no privado o link de entrada no grupo configurado pelo criador.",
  "Monitorar o status da assinatura para automações de acesso (avisos e remoções conforme suas regras).",
];

export function StripeTelegramLinkingGuide() {
  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="border-border border-b bg-linear-to-br from-card via-card to-primary/20">
        <Badge variant="outline" className="w-fit">
          Stripe + Telegram
        </Badge>
        <CardTitle className="font-heading text-xl">
          Como funciona o vínculo assinatura e Telegram
        </CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          Entenda o fluxo completo para você (criador) e para quem assina pelo
          bot, com transparência sobre o que o Gateon faz com os dados — em
          conformidade com a LGPD.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 py-4">
        <section className="space-y-3">
          <h3 className="font-heading font-medium text-foreground text-sm">
            Para você (criador)
          </h3>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground text-sm leading-relaxed">
            {creatorSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Ao conectar um plano, escolha o grupo de destino. O limite de grupos
            distintos segue o seu plano Gateon:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground text-sm">
            {stripePaymentGroupLimitsByPlan.map((item) => (
              <li key={item.plan}>
                <span className="font-medium text-foreground">{item.plan}</span>
                : até {item.maxGroups} grupo(s) distintos no /start
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="font-heading font-medium text-foreground text-sm">
            Para quem assina (seu cliente)
          </h3>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground text-sm leading-relaxed">
            {customerSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-background/60 p-4">
          <h3 className="font-heading font-medium text-foreground text-sm">
            O que o bot faz (e o que não faz)
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground text-sm leading-relaxed">
            {botActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs leading-relaxed">
            O bot não lê mensagens do grupo para fins de pagamento, não vende
            dados e não acessa informações além do necessário para o controle de
            assinatura e acesso.
          </p>
        </section>

        <Accordion className="gap-2">
          <AccordionItem value="privacy">
            <AccordionTrigger className="font-heading font-medium text-foreground text-sm hover:no-underline">
              Privacidade e uso dos dados
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4 text-sm leading-relaxed">
              <section>
                <h3 className="font-heading font-medium text-foreground">
                  O que as integrações fazem?
                </h3>
                <p className="mt-1 text-muted-foreground">
                  Conecte um gateway de pagamento para monitorar assinaturas e
                  cobranças automaticamente. Com isso, você pode enviar
                  mensagens, criar automações e gerenciar membros com base no
                  status de pagamento dos clientes.
                </p>
              </section>

              <section>
                <h3 className="font-heading font-medium text-foreground">
                  Vínculo Stripe + Telegram (LGPD)
                </h3>
                <p className="mt-1 text-muted-foreground">
                  Quando o visitante paga pelo bot, o Gateon registra a relação
                  entre o ID do Telegram e a assinatura na Stripe para liberar o
                  acesso ao grupo. O pagamento é processado pela Stripe; o
                  Gateon apenas consulta o status e envia o convite. O visitante
                  inicia a conversa voluntariamente ao abrir o link do bot. O
                  tratamento segue a LGPD com base na execução do serviço
                  solicitado (acesso ao grupo pago). O Gateon atua como
                  ferramenta do criador e processa o mínimo necessário para
                  automatizar o acesso.
                </p>
              </section>

              <section>
                <h3 className="font-heading font-medium text-foreground">
                  Dados que consultamos
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                  {monitoredData.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="font-heading font-medium text-foreground">
                  O que não acessamos
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                  {blockedData.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="font-heading font-medium text-foreground">
                  Como suas chaves são utilizadas
                </h3>
                <p className="mt-1 text-muted-foreground">
                  As chaves de API são usadas apenas para consultar assinaturas
                  e pagamentos da sua conta. Elas não são compartilhadas com
                  terceiros e são armazenadas de forma criptografada.
                </p>
              </section>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
