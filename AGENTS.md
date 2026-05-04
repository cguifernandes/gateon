<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Gateon: page-scoped components

- For UI that is **only used on one route (or route group)**, colocate it under that page’s `_components` directory (e.g. `src/app/(segment)/_components/`, `src/app/dashboard/foo/_components/`).
- **Split** page-specific work into small, focused files (one main concern per file when it grows beyond ~200–300 lines or mixes unrelated sections).
- Put **shared** UI used by **multiple** routes in `src/components/` (or another agreed shared path), not in a page’s `_components`.
- The `_components` folder name stays literal (`_components`) as a Next.js colocation convention.

## Gateon: English in code

- New **file names** and **module paths** (except framework conventions like `layout.tsx`, `page.tsx`) : **English** (`UserCard.tsx`, `pricing-cta.tsx`).
- **Component names, types, variables, function names, hooks, and exports**: **English** (`isOpen`, `handleSubmit`, `PricingSection`).
- **Comments in code** : prefer **English** for consistency.
- **User-facing copy** (UI strings) may be **localized** (e.g. `pt-BR` for a Brazilian product) when the product requires it; still keep **identifier names in English** and use constants or i18n keys as needed.

---

# 📌 Visão Geral do Projeto

Este projeto consiste em um assistente automatizado para gerenciamento de acesso a grupos (ex: Telegram), baseado em assinaturas.

O sistema permite que usuários conectem seus grupos e automatizem:
- Controle de entrada e saída de membros
- Validação de assinaturas
- Comunicação automática com os usuários

---

# 🎯 Objetivo

Permitir que criadores/administradores gerenciem grupos pagos de forma automatizada, sem necessidade de intervenção manual.

---

# ⚙️ Funcionamento Geral

1. O usuário informa o ID do grupo
2. O sistema adiciona um bot automaticamente ao grupo
3. O bot passa a monitorar os membros
4. O usuário conecta um gateway de pagamento via API
5. O sistema valida assinaturas ativas
6. Usuários inadimplentes são removidos automaticamente
7. Mensagens automáticas são enviadas com base no status da assinatura

---

# 🤖 Bot (Regras de Comportamento)

O bot deve:

- Ser adicionado automaticamente ao grupo do usuário
- Ter permissão de administrador
- Monitorar entradas e saídas
- Validar status de assinatura antes de permitir permanência
- Remover usuários sem assinatura ativa
- Enviar mensagens automáticas quando:
  - A assinatura estiver próxima do vencimento
  - A assinatura estiver vencida
  - O usuário for removido

---

# 💳 Integração com Gateway de Pagamento

## Regras:

- O usuário deve fornecer uma chave de API
- A API deve ter acesso **somente leitura**
- O sistema só pode acessar:
  - Quantidade de assinantes
  - Status da assinatura (ativa, vencida, cancelada)
- NÃO armazenar dados sensíveis (cartão, CPF, etc)

## Objetivo:

Garantir segurança e limitar responsabilidades do sistema

---

# 🔐 Segurança

- Nunca armazenar dados sensíveis de pagamento
- Criptografar chaves de API
- Validar todas as requisições externas
- Logs devem ser anonimizados quando possível

---

# 🧠 Lógica de Assinatura

Um usuário pode estar em um dos estados:

- Ativo → permanece no grupo
- Atrasado → recebe aviso
- Vencido → removido do grupo
- Cancelado → removido do grupo

---

# 🔔 Mensagens Automáticas

O sistema deve permitir personalização de mensagens:

## Tipos de mensagem:

- Aviso de vencimento próximo
- Assinatura vencida
- Confirmação de pagamento
- Remoção do grupo

---

# 🧩 Configurações do Usuário

O usuário poderá:

- Informar ID do grupo
- Conectar gateway de pagamento
- Definir mensagens personalizadas
- Definir tempo de aviso antes do vencimento
- Ativar/desativar remoção automática

---

# 📊 Dashboard (Futuro)

O sistema poderá exibir:

- Total de assinantes
- Ativos vs vencidos
- Taxa de retenção
- Histórico de remoções

---

# 🚫 Limitações

- O sistema NÃO gerencia pagamentos
- NÃO cria assinaturas
- Apenas consome dados do gateway
- Depende das permissões do bot no grupo

---

# 🔄 Fluxo Resumido

1. Usuário conecta grupo
2. Usuário conecta gateway
3. Sistema sincroniza assinantes
4. Bot valida membros
5. Sistema executa ações automáticas

---

# 🧪 Possíveis Melhorias Futuras

- Suporte a múltiplos grupos
- Integração com mais gateways
- Webhooks em tempo real
- Sistema antifraude
- Relatórios avançados

---

# 📌 Regras Gerais do Projeto

- Código deve ser modular
- Backend responsável por validação
- Frontend apenas consome API
- Todas as ações críticas devem ter log
- Evitar dependência de serviços instáveis

---
