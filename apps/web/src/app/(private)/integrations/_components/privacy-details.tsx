import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const monitoredData = [
  "Nome e e-mail do cliente",
  "Status da assinatura e data de vencimento",
  "Status de pagamento e plano contratado",
];

const blockedData = [
  "Senhas, dados de cartão e informações bancárias",
  "Dados financeiros sensíveis além do necessário para o monitoramento",
];

export function PrivacyDetails() {
  return (
    <Accordion className="gap-2">
      <AccordionItem value="privacy-details">
        <AccordionTrigger>
          Detalhes sobre privacidade e uso dos dados
        </AccordionTrigger>
        <AccordionContent className="space-y-4 text-sm leading-relaxed">
          <section>
            <h3 className="font-heading font-medium text-foreground">
              O que as integrações fazem?
            </h3>
            <div className="mt-1 text-muted-foreground">
              Conecte um gateway de pagamento para monitorar assinaturas e
              cobranças automaticamente. Com isso, você pode enviar mensagens,
              criar automações e gerenciar membros com base no status de
              pagamento dos clientes.
            </div>
          </section>

          <section>
            <h3 className="font-heading font-medium text-foreground">
              Dados que consultamos
            </h3>
            <div className="mt-1 text-muted-foreground">
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                {monitoredData.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h3 className="font-heading font-medium text-foreground">
              O que não acessamos
            </h3>
            <div className="mt-1 text-muted-foreground">
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                {blockedData.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h3 className="font-heading font-medium text-foreground">
              Como suas chaves são utilizadas
            </h3>
            <div className="mt-1 text-muted-foreground">
              As chaves de API são usadas apenas para consultar assinaturas e
              pagamentos da sua conta. Elas não são compartilhadas com
              terceiros e são armazenadas de forma criptografada.
            </div>
          </section>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
