"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StripeBillingConnectInput } from "@/lib/zod/stripe-billing-schemas";

const restrictedKeyPermissions = [
  {
    label: "Core → Basic Business Contact Information (Leitura)",
    description:
      "Permite validar as informações básicas da conta Stripe durante a configuração da integração.",
  },
  {
    label: "Access Management → Accounts v2 (Leitura)",
    description:
      "Permite validar que a chave pertence à conta Stripe correta antes de salvar a integração.",
  },
  {
    label: "Core → Customers (Leitura)",
    description:
      "Permite identificar os clientes (nome e e-mail) para relacionar assinantes aos membros do grupo.",
  },
  {
    label: "Billing → Subscriptions (Leitura)",
    description:
      "Permite verificar se uma assinatura está ativa, cancelada ou vencida para controlar o acesso automaticamente.",
  },
  {
    label: "Billing → Invoices (Leitura)",
    description:
      "Permite acompanhar o status das faturas e pagamentos para calcular métricas como receita recorrente.",
  },
  {
    label: "Core → Products (Leitura)",
    description: "Permite listar os produtos disponíveis na conta Stripe.",
  },
  {
    label: "Billing → Prices (Leitura)",
    description:
      "Permite listar os preços recorrentes associados aos produtos e selecionar quais serão monitorados.",
  },
] as const;

type StripeApiKeyStepProps = {
  form: UseFormReturn<StripeBillingConnectInput>;
  apiKeyInputId: string;
};

export function StripeApiKeyStep({
  form,
  apiKeyInputId,
}: StripeApiKeyStepProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={apiKeyInputId}>Chave secreta da Stripe</FieldLabel>
        <Input
          id={apiKeyInputId}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          placeholder="sk_ ou rk_live..."
          className="font-mono [-webkit-text-security:disc]"
          {...form.register("apiKey")}
        />
        {form.formState.errors.apiKey?.message ? (
          <FieldError>{form.formState.errors.apiKey.message}</FieldError>
        ) : null}

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="font-heading font-medium text-foreground text-sm">
              Opção 1 — Chave restrita (recomendado)
            </p>
            <p className="mt-1 font-light text-muted-foreground text-xs leading-relaxed">
              Limite o acesso ao mínimo que o Gateon precisa: somente leitura
              dos recursos usados para listar planos, assinaturas e pagamentos.
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground text-xs font-light leading-relaxed">
              <li>
                Acesse o{" "}
                <a
                  href="https://dashboard.stripe.com/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  painel da Stripe
                </a>{" "}
                e faça login.
              </li>
              <li>
                Abra{" "}
                <span className="font-medium text-foreground">
                  Desenvolvedores → Chaves de API
                </span>
                .
              </li>
              <li>
                Clique em{" "}
                <span className="font-medium text-foreground">
                  Criar chave restrita
                </span>{" "}
                (ou acesse{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  este atalho
                </a>
                ).
              </li>
              <li>
                Dê um nome à chave (ex.:{" "}
                <span className="font-mono text-foreground">
                  Gateon — leitura
                </span>
                ) e mantenha o tipo{" "}
                <span className="font-medium text-foreground">
                  Chave secreta
                </span>
                .
              </li>
              <li>
                Em permissões, habilite apenas{" "}
                <span className="font-medium text-foreground">Leitura</span> nos
                recursos abaixo — nenhuma permissão de escrita é necessária:
                <ul className="mt-2 space-y-2 pl-4">
                  {restrictedKeyPermissions.map((permission) => (
                    <li key={permission.label} className="list-disc">
                      <span className="font-medium text-foreground">
                        {permission.label}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {permission.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                Crie a chave, copie o valor que começa com{" "}
                <span className="font-mono text-foreground">rk_live_</span> e
                cole no campo acima. A Stripe só exibe a chave completa uma vez.
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="font-heading font-medium text-foreground text-sm">
              Opção 2 — Chave secreta padrão
            </p>
            <p className="mt-1 font-light text-muted-foreground text-xs leading-relaxed">
              Mais rápida para testar. Use apenas em ambiente de teste ou se
              você aceita conceder acesso amplo de leitura à conta.
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground text-xs font-light leading-relaxed">
              <li>
                No painel da Stripe, escolha o modo{" "}
                <span className="font-medium text-foreground">Teste</span> (
                <span className="font-mono text-foreground">sk_test_</span>) ou{" "}
                <span className="font-medium text-foreground">Produção</span> (
                <span className="font-mono text-foreground">sk_live_</span>).
              </li>
              <li>
                Abra{" "}
                <span className="font-medium text-foreground">
                  Desenvolvedores → Chaves de API
                </span>
                .
              </li>
              <li>
                Em{" "}
                <span className="font-medium text-foreground">
                  Chaves padrão
                </span>
                , clique em{" "}
                <span className="font-medium text-foreground">
                  Revelar chave secreta
                </span>{" "}
                e copie o valor completo.
              </li>
            </ol>
          </div>
        </div>
      </Field>
    </FieldGroup>
  );
}
