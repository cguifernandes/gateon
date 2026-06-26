<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Gateon — Guia para agentes

Documento canônico do monorepo. `CLAUDE.md` aponta para este arquivo com um resumo curto.

---

## Convenções de código

### Componentes por rota (`_components`)

- UI usada **apenas em uma rota (ou route group)** → colocar em `src/app/(segment)/_components/` (ex.: `src/app/(private)/groups/_components/`).
- Dividir em arquivos pequenos quando passar de ~200–300 linhas ou misturar responsabilidades.
- UI **compartilhada entre rotas** → `src/components/` (ou pasta compartilhada acordada), nunca em `_components` de uma página.
- O nome da pasta permanece literal: `_components`.

### Inglês no código

- **Nomes de arquivos e paths** (exceto convenções do framework como `layout.tsx`, `page.tsx`): **inglês** (`UserCard.tsx`, `pricing-cta.tsx`).
- **Componentes, tipos, variáveis, funções, hooks e exports**: **inglês** (`isOpen`, `handleSubmit`).
- **Comentários**: preferir **inglês**.
- **Texto de produto (UI)** pode ser localizado (ex.: `pt-BR`); identificadores permanecem em inglês.

### Schemas Zod

| App | Localização |
|-----|-------------|
| Web | `apps/web/src/lib/zod/` — nunca dentro de `_components` |
| API | `apps/api/src/lib/zod/` — **sempre** aqui; nunca em `modules/<name>/` |
| Auth (web) | `apps/web/src/lib/zod/auth-schemas.ts` |

### Módulos NestJS (`apps/api`)

**Regra obrigatória:** cada feature em `apps/api/src/modules/<name>/` contém **somente** estes arquivos:

```
modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
└── <name>.spec.ts
```

- **Não** criar subpastas (`schemas/`, `guards/`, helpers) dentro do módulo.
- **Múltiplas classes** do mesmo tipo (ex.: dois `@Controller` ou dois `@Injectable`) ficam no **mesmo** arquivo (`stripe-billing.controller.ts`, `stripe-billing.service.ts`).
- **Schemas Zod** → `apps/api/src/lib/zod/<name>-schemas.ts`.
- **Guards compartilhados** → `apps/api/src/lib/guards/`.
- **Lógica pura / clients HTTP** → `apps/api/src/lib/`.
- **Infra sem HTTP** (ex.: `prisma`) pode ter só `*.module.ts` + `*.service.ts` — sem controller nem spec se não houver comportamento testável.
- Registrar novos módulos em `apps/api/src/app.module.ts`.
- **Todo módulo com regras de negócio deve incluir `<name>.spec.ts`** — ver [Testes da API](#testes-da-api-appsapi) abaixo.

### Testes da API (`apps/api`)

**Regra:** ao criar ou expandir um módulo, incluir ou atualizar `<name>.spec.ts` no mesmo conjunto de mudanças.

**Stack:** Jest 30 + `@nestjs/testing` + `ts-jest`. Config em `apps/api/package.json` (`testRegex`: `.*\.spec\.ts$`, `rootDir`: `src`).

**Comandos** (a partir de `apps/api/`):

| Comando | Uso |
|---------|-----|
| `npm test` | Suite completa |
| `npm run test:watch` | Desenvolvimento |
| `npm run test:cov` | Cobertura |
| `npm run test:stripe` | Filtro por feature (`jest --testPathPatterns stripe`) |

#### Onde colocar os arquivos

| Tipo | Local | Nome |
|------|-------|------|
| Testes do módulo | `modules/<name>/` | `<name>.spec.ts` |
| Fixtures de integração | `apps/api/src/testing/` | conforme necessário |

**Não** criar `*.spec.ts` em `apps/api/src/lib/` nem em `apps/api/src/lib/zod/`. Toda lógica pura, schema Zod e integração DB usados por um módulo ficam no **mesmo** `modules/<name>/<name>.spec.ts` desse módulo, com `describe` aninhados por camada.

**Um único** `<name>.spec.ts` por módulo agrupa testes de service, helpers em `lib/` consumidos pelo módulo, schemas Zod e integração com banco (quando aplicável).

Testes que dependem de PostgreSQL: use `describe.skip` quando `DATABASE_URL` estiver ausente (padrão no mesmo `<name>.spec.ts`).

#### O que testar (mínimo por módulo)

| Camada | Onde no `<name>.spec.ts` | Foco |
|--------|--------------------------|------|
| **Service** | `describe('<Name>Service')` | Orquestração, filtros, erros, mocks de dependências |
| **Schemas Zod** | `describe('<schema>')` | `safeParse` — válidos, inválidos, mensagens |
| **Integração DB** | `describeWithDb(...)` | Fluxo real com Prisma; skip sem `DATABASE_URL` |
| **Helpers em `lib/`** | `describe('<helper>')` no spec do módulo que usa a regra | Funções puras; matrizes com `it.each` |

**Prioridade:** extrair regras testáveis para `apps/api/src/lib/` e cobri-las no `<name>.spec.ts` do módulo dono do comportamento.

#### Padrão 1 — Service NestJS (mock de dependências)

```typescript
import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExampleService } from './example.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExampleService', () => {
  let service: ExampleService;
  const findFirst = jest.fn();

  beforeEach(async () => {
    findFirst.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExampleService,
        {
          provide: PrismaService,
          useValue: { exampleModel: { findFirst } },
        },
      ],
    }).compile();

    service = module.get(ExampleService);
  });

  it('throws when resource is missing', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
```

- Mockar **apenas** o que o service usa (`PrismaService`, `TelegramService`, outros services).
- Para métodos internos pesados, preferir `jest.spyOn(service, 'runX').mockResolvedValue(...)` quando o foco for outro método público.
- Não usar banco real em `*.spec.ts`.

#### Padrão 2 — Lógica pura em `lib/` (no spec do módulo)

```typescript
import { resolveExampleTrigger } from '../../lib/example-rules';

describe('resolveExampleTrigger', () => {
  it('returns null when input is stable', () => {
    expect(resolveExampleTrigger(null, 'active')).toBeNull();
  });

  it('maps status transition to trigger type', () => {
    expect(resolveExampleTrigger({ status: 'active' }, 'canceled')).toBe(
      'EXAMPLE_CANCELED',
    );
  });
});
```

- Sem `@nestjs/testing`.
- Colocar no `modules/<name>/<name>.spec.ts` do módulo que depende da regra.
- Usar `it.each` para matrizes de casos (ver `stripe-billing.spec.ts`, `alerts.spec.ts`).

#### Padrão 3 — Schemas Zod (`lib/zod/`)

Colocar no `<name>.spec.ts` do módulo que valida o schema (não criar `lib/zod/**/*.spec.ts`).

```typescript
import { exampleUpsertSchema } from '../../lib/zod/example-schemas';

describe('exampleUpsertSchema', () => {
  it('accepts valid payload', () => {
    const result = exampleUpsertSchema.safeParse({ name: 'Test', body: 'Hi' });
    expect(result.success).toBe(true);
  });

  it('rejects missing required field', () => {
    const result = exampleUpsertSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
```

#### Padrão 4 — Integração com banco (opcional)

```typescript
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

loadDotenv({ path: resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeWithDb = databaseUrl ? describe : describe.skip;

describeWithDb('Example (integration)', () => {
  jest.setTimeout(60_000);
  // PrismaClient + adapter; cleanup no afterAll
});
```

Referências no repo: `stripe-billing.spec.ts`, `src/testing/stripe-alert-test-fixtures.ts`.

#### Convenções de nomenclatura

- Arquivo do módulo: `<name>.spec.ts` (inglês, kebab-case do módulo).
- `describe`: nome da classe ou função (`ExampleService`, `resolveExampleTrigger`).
- `it`: frase em inglês descrevendo comportamento (`'throws when resource is missing'`).
- Um `describe` por unidade; agrupar casos relacionados com `describe` aninhado ou `it.each`.

#### Checklist — novo módulo `modules/<name>/`

1. [ ] `*.module.ts` registrado em `app.module.ts`
2. [ ] Apenas os 4 arquivos padrão no diretório do módulo (ou module+service para infra)
3. [ ] Schemas em `lib/zod/<name>-schemas.ts`
4. [ ] `<name>.spec.ts` com happy path + erros principais (+ integração DB se crítico); helpers `lib/` testados no mesmo arquivo
5. [ ] Funções puras em `lib/` sem `lib/**/*.spec.ts` — cobertura via spec do módulo
6. [ ] `npm test` passando em `apps/api`

**Anti-padrões:** testes que só assertam mocks sem comportamento; testes E2E HTTP no lugar de unitários; specs sem rodar na CI local (`npm test`).

### DRY e reutilização de código (API)

**Obrigatório antes de qualquer feature nova na API.** Evitar duplicação é requisito de merge — não opcional.

#### Regras permanentes

- Antes de criar qualquer **função**, pesquisar funções semelhantes já existentes (`apps/api/src/lib/`, `utils/`, services).
- Antes de criar qualquer **endpoint**, verificar controllers existentes (`modules/*/*.controller.ts`).
- Antes de criar qualquer **service**, verificar services existentes e `GroupLimitService` / helpers em `lib/`.
- Antes de criar qualquer **helper**, verificar `apps/api/src/lib/` e `apps/api/src/utils/`.
- Antes de criar qualquer **repository** ou query Prisma repetida, buscar `where: { userId }` / ownership no codebase.
- **Reutilizar** código existente sempre que possível; **estender** em vez de copiar.
- Aplicar **DRY** rigorosamente; não duplicar regras de negócio entre módulos.
- **Centralizar** validações compartilhadas em `lib/zod/` e ownership em `lib/` (ex.: `assert-owned-group`, `is-internal-bot-secret-valid`).
- **Centralizar** queries compartilhadas (ex.: grupo do usuário, sessão válida) em um único helper/service.
- **Refatorar** duplicações identificadas **antes** de criar novas implementações paralelas.
- Toda nova feature deve passar por **análise de reutilização** documentada no PR/commit.
- Sempre **documentar** onde uma funcionalidade semelhante já existe (comentário `// see lib/foo.ts` ou link no PR).
- Sempre **preferir extensão** de funcionalidades existentes em vez de implementações paralelas.

#### Helpers compartilhados preferidos (API — evitar reimplementar)

| Responsabilidade | Onde centralizar | Não duplicar em |
|------------------|------------------|-----------------|
| Sessão / `userId` do request | `AuthGuard` + decorator ou `lib/request-auth.ts` | Cada controller com `private getUserId` |
| Secret do bot (`x-gateon-bot-secret`) | `lib/bot-internal-secret.ts` | `telegram`, `group-bot-settings`, `bot-start-settings` services |
| Ownership de `TelegramGroups` | `lib/owned-telegram-group.ts` ou método em service dedicado | `telegram`, `stripe-billing`, `group-bot-settings` |
| Validação HTTP body/query | DTOs `nestjs-zod` + pipe global | `.parse(body)` manual em todo handler |
| Limites de plano | `modules/group-limits/group-limits.service.ts` + `lib/plan/plan-limits.ts` | Lógica inline nos services |

#### Checklist obrigatório — nova funcionalidade (API)

1. [ ] Busquei em `apps/api/src/` por funções, endpoints e queries semelhantes (grep/semantic search).
2. [ ] Listei o que já existe e decidi **reutilizar / estender** vs. criar novo (justificativa no PR).
3. [ ] Não criei `isInternalSecretValid`, `getUserId`, `findOwnedGroup` ou equivalente sem checar helpers acima.
4. [ ] Schemas Zod em `lib/zod/`; sem schema duplicado no módulo.
5. [ ] Regras de negócio puras em `lib/`; service só orquestra.
6. [ ] Endpoint autenticado usa `@UseGuards(AuthGuard)`; interno do bot usa secret + `timingSafeEqual`.
7. [ ] Rotas públicas/sensíveis têm `@Throttle` adequado (login, finalize checkout, password-reset).
8. [ ] `<name>.spec.ts` do módulo atualizado; **sem** novo `lib/**/*.spec.ts`.
9. [ ] Se tocar código sincronizado web/bot, atualizei todos os arquivos da tabela [Código sincronizado](#código-sincronizado-entre-apps).

### Lint e formatação

| App | Ferramenta |
|-----|------------|
| `apps/web`, `apps/bot` | Biome (`npm run lint:web`, `npm run format:web`) |
| `apps/api` | ESLint + Prettier (via workspace `@gateon/api`) |

---

## Arquitetura do monorepo

```
gateon/
├── apps/
│   ├── web/     @gateon/web   Next.js 16, React 19, Tailwind 4, shadcn v4
│   ├── api/     @gateon/api   NestJS 11, Prisma 7, PostgreSQL
│   └── bot/     @gateon/bot   Grammy, Node ≥22, ESM
├── package.json               workspaces npm + Turbo
└── turbo.json
```

**Sem pasta `packages/`** — lógica compartilhada é duplicada manualmente entre apps (ver seção "Código sincronizado").

### Scripts principais

| Comando | Efeito |
|---------|--------|
| `npm run dev` | Web (3000) + API (4000) via Turbo |
| `npm run dev:bot` | Bot Telegram separado |
| `npm run build` | Build de todos os apps |
| `npm run lint` | Lint web + api + bot |

### Comunicação entre apps

```
┌─────────────┐   cookie gateon.session    ┌─────────────┐
│  apps/web   │ ─────────────────────────► │  apps/api   │
│  (Next.js)  │   API_URL / INTERNAL_API   │  (NestJS)   │
└─────────────┘                            └──────┬──────┘
                                                  │ Prisma
┌─────────────┐   x-gateon-bot-secret           ▼
│  apps/bot   │ ─────────────────────────► PostgreSQL
│  (Grammy)   │   GATEON_API_BASE_URL
└─────────────┘
```

| Variável | Uso |
|----------|-----|
| `API_URL` / `INTERNAL_API_URL` | Web → API (server-side) |
| `WEB_BASE_URL` | CORS da API |
| `SESSION_COOKIE_NAME` | `gateon.session` (httpOnly) |
| `TELEGRAM_BOT_TOKEN` | Token do bot |
| `GATEON_API_BASE_URL` | Bot → API |
| `TELEGRAM_BOT_INTERNAL_SECRET` | Header `x-gateon-bot-secret` |

---

## Visão geral do produto

Gateon automatiza o acesso a grupos pagos (Telegram) com base em assinaturas Stripe.

**O que o sistema faz hoje:**

- Conectar grupos Telegram via bot com validação de permissões de administrador
- Sincronizar assinantes Stripe (API read-only, chave criptografada)
- Monitorar membros, aplicar limites de plano e ações em massa (ban/kick)
- Enviar alertas automatizados (Telegram + eventos Stripe)
- Personalizar mensagem `/start` do bot com planos e botões de checkout Stripe
- Dashboard com visão de grupos, membros, billing e alertas

**O que o sistema NÃO faz:**

- Não processa pagamentos diretamente — redireciona para Stripe Checkout
- Não cria assinaturas no Stripe — apenas lê status via API
- Não armazena dados sensíveis (cartão, CPF, etc.)

---

## Fluxos de negócio

### 1. Conexão de grupo Telegram

1. Usuário inicia conexão na web (`/groups`) → API cria `TelegramGroupConnectionIntent` com token
2. Usuário envia `/start <token>` ao bot no Telegram
3. Bot valida token, checa direitos admin do bot no grupo (`telegram-admin-rights`)
4. API confirma conexão → `TelegramGroups` criado
5. Bot monitora `chat_member` (join/leave/ban) e dispara alertas

### 2. Integração Stripe

1. Usuário conecta conta Stripe em `/integrations` (chave API read-only)
2. API criptografa chave, sincroniza customers/subscriptions/payments
3. Usuário pode vincular conexão Stripe a um grupo Telegram (`linkedGroup`)
4. Métricas: assinaturas ativas, expirando, expiradas, receita
5. Sync dispara triggers de alerta (pagamento, renovação, cancelamento, expiração)

### 3. Bot `/start` e checkout

1. Cada usuário tem `TelegramBotStartSettings` com token público `g_*`
2. Mensagem personalizável: welcome, planos Stripe, botões de pagamento, passos de assinatura
3. Visitante inicia `/start` → bot monta mensagem via `bot-start-message-builder`
4. Botões de pagamento → callback `pbg:*` → seleção de grupo → Stripe Checkout
5. Após pagamento: `/stripe/checkout/success` finaliza sessão → vínculo membro↔customer

### 4. Alertas automatizados

- Destinos: `GROUP`, `TOPIC`, `MEMBERS`, `QUICK_ALERT`, `AUTOMATION`
- Triggers Telegram: join, leave, ban, forum topic, mensagens privadas/grupo
- Triggers Stripe: via sync service
- Runs com rate limit; deliveries rastreadas; templates reutilizáveis
- UI em `/alerts` com cards, drawer de detalhe e filtros

### 5. Estados de assinatura (Stripe)

| Status | Ação no grupo |
|--------|---------------|
| Ativo | Permanece |
| Atrasado (expiring) | Pode receber aviso via alerta |
| Vencido / cancelado | Remoção via ações do bot (configurável) |

### 6. Limites de plano

Planos definidos em `plan-schemas.ts`: `free`, `starter`, `pro`.

| Limite | free | starter | pro |
|--------|------|---------|-----|
| Grupos | 5 | 15 | 100 |
| Membros/grupo | 100 | 150 | 300 |
| Grupos Stripe payment | ver `lib/plan/stripe-payment-group-limits.ts` | | |

**Atualmente todos os usuários usam `free`** — billing Gateon ainda não está wired ao modelo `Users`.

Arquivos: `apps/api/src/lib/plan/plan-limits.ts`, `apps/web/src/lib/plan-limits.ts`, `apps/api/src/modules/group-limits/group-limits.service.ts`.

---

## Módulos da API (`apps/api/src/modules/`)

| Módulo | Propósito |
|--------|-----------|
| `group-limits/` | Limites de grupos/membros por plano (`GroupLimitService`) |
| `prisma/` | Cliente Prisma global |
| `auth/` | Registro, login, logout, refresh, Google OAuth; sessões em cookie |
| `telegram/` | Grupos, membros, conexão via bot, fotos, bulk actions, eventos internos |
| `group-bot-settings/` | Settings por grupo (`enabled`, `notifyPermissionLoss`); endpoint interno |
| `bot-start-settings/` | Mensagem `/start`, planos Stripe, botões de pagamento |
| `alerts/` | CRUD alertas, templates, runs, entregas, trigger interno |
| `stripe-billing/` | Conexão Stripe, sync, checkout Telegram, vínculo grupo↔plano |

**Infra global:** `ThrottlerGuard`, `helmet`, `cookie-parser`, CORS, `ZodValidationPipe`.

**Libs compartilhadas:** `apps/api/src/lib/` — funções puras, clients HTTP, schemas Zod (`lib/zod/`). **Não** criar arquivos soltos na raiz de `lib/`; usar subpastas por domínio:

```
lib/
├── guards/          # AuthGuard
├── http/            # request-public-base-url
├── url/             # normalize-base-url
├── query/           # pagination, date-param-range
├── prisma/          # prisma-errors
├── plan/            # plan-limits, stripe-payment-group-limits
├── auth/            # password-reset, mail, email template
├── alerts/          # delivery-messages
├── telegram/        # admin-rights, member-presence, bot-status-filter, groups-list-filter
│   └── groups-list/ # resolver split: types, summary, query, members, mapper, resolver
├── stripe/          # checkout, webhook, billing client/sync/dispatch, telegram links
└── zod/             # schemas HTTP (nunca em modules/)
```

Serviço Nest de limites: `modules/group-limits/` (não em `lib/`).

---

## Rotas Web (`apps/web/src/app/`)

### Públicas

| Rota | Descrição |
|------|-----------|
| `/` | Landing |
| `/privacy`, `/terms` | Legal |
| `/login`, `/register` | Auth (layout `auth-light-beams`, tema forçado light) |
| `/stripe/checkout/success`, `/cancel` | Finalização checkout Stripe |

### Privadas (`(private)/layout.tsx`)

Protegidas por `getSessionUser()` → redirect `/login`.

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Overview: grupos, alertas, billing, bots conectados |
| `/groups` | Lista de grupos |
| `/groups/[groupId]/bot` | Config do bot por grupo |
| `/members` | Membros rastreados + bulk actions |
| `/alerts` | Central de alertas |
| `/integrations` | Stripe e gateways |
| `/settings` | Bot start settings + privacidade |

### BFF (`apps/web/src/app/api/`)

Route handlers autenticados que fazem proxy para a API Nest — usados por Client Components (mutations, polling). Exemplos: `api/alerts/**`, `api/telegram/**`, `api/stripe-billing/**`, `api/bot-start-settings`.

---

## Padrões Web → API

### Três camadas

1. **Server Components / server functions** (`apps/web/src/lib/server/`)
   - `getSessionUser()`, `getTelegramGroups()`, `getAlerts()`, etc.
   - Fetch direto à API com cookie + `getServerApiBaseUrl()`
   - Validação de resposta com Zod (`apps/web/src/lib/zod/`)

2. **Server Actions** (`*.action.ts`)
   - Auth: login, register, logout
   - Propagam `Set-Cookie` via `apply-session-set-cookie.ts`

3. **Route handlers BFF** (`apps/web/src/app/api/**/route.ts`)
   - Proxy para Client Components
   - Repassam cookie, validam body com Zod

### Autenticação

- Cookie `gateon.session` (httpOnly) propagado web ↔ API
- `AuthGuard` na API lê cookie; web usa `/api/auth/session` no client

---

## Bot (`apps/bot/`)

**Entry:** `apps/bot/src/main.ts` — Grammy.

| Handler | Arquivo | Fluxo |
|---------|---------|-------|
| `/start` | `handlers/start.ts` | Token `g_*` → conexão ou mensagem privada + checkout |
| Payment callback | `handlers/start-payment-group.ts` | `pbg:*` → grupo + botões Stripe |
| `/help` | `handlers/help.ts` | Ajuda |
| `chat_member` | `handlers/chat-member.ts` | Join/leave/ban → API + alertas |
| `my_chat_member` | `handlers/my-chat-member.ts` | Bot adicionado → conexão |
| `chat_migrate` | `handlers/chat-migrate.ts` | Migração group→supergroup |
| Forum | `handlers/chat-forum.ts` | Forum topics |

**Suporte:** `gateon-api.ts`, `bot-start-message-builder.ts`, `bot-start-subscribe-steps.ts`, `bot-start-payment-callback.ts`, `alert-triggers.ts`, `telegram-admin-rights.ts`.

---

## Banco de dados (Prisma)

**Schema:** `apps/api/prisma/schema.prisma` — PostgreSQL.

### Domínios

| Domínio | Modelos principais |
|---------|-------------------|
| Auth | `Users`, `Accounts`, `Sessions` |
| Telegram | `TelegramAccounts`, `TelegramGroupConnectionIntents`, `TelegramGroups`, `TelegramGroupMembers`, `TelegramGroupBotSettings`, `TelegramForumTopics` |
| Alertas | `TelegramAlerts`, `TelegramAlertTargets`, `TelegramAlertTemplates`, `TelegramAlertRuns`, `TelegramAlertDeliveries` |
| Stripe | `StripeBillingConnections`, `StripeBillingCustomers`, `StripeBillingSubscriptions`, `StripeBillingPayments`, `StripeTelegramCheckoutSessions`, `StripeTelegramMemberLinks` |
| Bot start | `TelegramBotStartSettings` (1:1 com user) |

```
Users
 ├── TelegramGroups (1:N)
 │    ├── TelegramGroupMembers
 │    ├── TelegramGroupBotSettings (1:1)
 │    ├── TelegramAlerts
 │    └── StripeBillingConnections (linked group)
 ├── StripeBillingConnections (1:N)
 ├── TelegramBotStartSettings (1:1)
 └── TelegramAlerts (1:N)
```

---

## Código sincronizado entre apps

Não há pacote `@gateon/shared`. Manter em sync manualmente (comentários "keep in sync"):

| Conceito | API | Web | Bot |
|----------|-----|-----|-----|
| Plan limits | `api/src/lib/plan/plan-limits.ts` | `web/src/lib/plan-limits.ts` | — |
| Stripe payment group limits | `api/src/lib/plan/stripe-payment-group-limits.ts` | `web/src/lib/zod/stripe-payment-group-schemas.ts` | — |
| Plan schemas | `api/src/lib/zod/plan-schemas.ts` | `web/src/lib/zod/plan-schemas.ts` | — |
| Telegram admin rights | `api/src/lib/telegram-admin-rights.ts` | `web/src/lib/telegram-admin-rights.ts` | `bot/src/telegram-admin-rights.ts` |
| Bot start message | — | `web/src/lib/bot-start-message-builder.ts` (preview) | `bot/src/bot-start-message-builder.ts` (runtime) |
| Bot start subscribe steps | — | `web/src/lib/bot-start-subscribe-steps.ts` | `bot/src/bot-start-subscribe-steps.ts` |
| Alert schemas | `api/.../alert-schemas.ts` | `web/src/lib/zod/alert-schemas.ts` | `bot/alert-triggers.ts` |
| Stripe billing schemas | `api/.../stripe-billing-schemas.ts` | `web/src/lib/zod/stripe-billing-schemas.ts` | — |
| Bot start settings schemas | `api/.../bot-start-settings-schemas.ts` | `web/src/lib/zod/bot-start-settings-schemas.ts` | tipos em `gateon-api.ts` |

Ao alterar regras de negócio compartilhadas, atualizar **todos** os arquivos correspondentes.

---

## Design System (`apps/web`)

### Stack UI

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 App Router, React 19, RSC |
| Estilo | Tailwind CSS v4 (config em CSS, sem `tailwind.config.js`) |
| Componentes | shadcn/ui v4, style **`base-nova`**, base color `neutral` |
| Primitivos | **Base UI** (`@base-ui/react`) — maioria dos componentes |
| Radix | `@radix-ui/react-select` (Select), dialog-stack |
| Variantes | CVA (`class-variance-authority`) |
| Classes | `cn()` = `clsx` + `tailwind-merge` em `src/lib/utils.ts` |
| Formulários | react-hook-form + @hookform/resolvers + Zod |
| Toasts | Sonner |
| Drawers | Vaul |
| Animação | Motion (`motion/react`) |
| Charts | Recharts (dashboard) |
| Tema | next-themes (class `dark` no `<html>`) |
| Extra | Kibo UI (`@kibo-ui`) — theme-switcher, dialog-stack |

**Config shadcn:** `apps/web/components.json` — aliases `@/components`, `@/components/ui`, `@/lib/utils`.

### Tokens de tema (`src/app/globals.css`)

Tailwind v4 via `@import "tailwindcss"`, `tw-animate-css`, `shadcn/tailwind.css`.

**Dark mode:** `@custom-variant dark (&:is(.dark *));` — rotas privadas permitem system/light/dark; auth e landing forçam light.

#### Tokens semânticos (OKLCH)

| Token | Uso |
|-------|-----|
| `--background`, `--foreground` | Fundo e texto base |
| `--primary` | `oklch(0.55 0.2 255)` ≈ `#3b82f6` (azul) |
| `--muted`, `--muted-foreground` | Fundos e textos secundários |
| `--destructive` | Ações destrutivas / erros |
| `--border`, `--input`, `--ring` | Bordas, inputs, focus ring |
| `--card`, `--popover` | Superfícies elevadas |
| `--sidebar-*` | Sidebar completa |
| `--chart-1…5` | Gráficos |

#### Paleta surface (custom, estilo Material)

```
--surface, --surface-dim, --surface-bright
--surface-container-lowest → --surface-container-highest
```

Usada no gradiente do layout privado: `from-surface-container to-surface-bright`.

#### Escalas extras

- `--color-slate-50…950`, `--color-blue-50…950` no bloco `@theme`
- `--radius: 0.625rem` com derivados `--radius-sm` até `--radius-4xl`

#### Scrollbar

`--scrollbar-size`, `--scrollbar-thumb`, `--scrollbar-thumb-hover` — tematizados por modo.

#### Classe especial

`.auth-light-beams` — gradiente animado azul/índigo para páginas de auth.

### Tipografia

| Papel | Fonte | Variável CSS |
|-------|-------|--------------|
| Corpo / UI | **Inter** (`next/font/google`) | `--font-inter` |
| Títulos (h1–h3, card titles, dialog titles) | **Geist Sans** (`geist/font/sans`) | `--font-heading` |

Padrões: títulos `font-heading font-semibold`; descrições `text-sm text-muted-foreground font-light`; labels de seção `text-xs uppercase tracking-wide text-muted-foreground`.

### Componentes shadcn (`src/components/ui/`)

`accordion`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `chart`, `checkbox`, `combobox`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `input`, `input-group`, `label`, `popover`, `progress`, `radio-group`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.

Kibo UI (fora de `ui/`): `kibo-ui/theme-switcher`, `kibo-ui/dialog-stack`.

### Componentes compartilhados (`src/components/`)

| Categoria | Componentes |
|-----------|-------------|
| Layout | `container.tsx`, `theme-provider.tsx`, `gateon-logo.tsx`, `loader-page.tsx` |
| Formulários | `form-field.tsx`, `forum-topic-select-field.tsx`, `google-login-button.tsx` |
| Dialogs | `add-group-bot-dialog.tsx`, `create-alert-dialog.tsx`, `remove-group-dialog.tsx`, `quick-notice-dialog.tsx`, `selectable-option-card.tsx` |
| Dados | `truncated-text-tooltip.tsx`, `avatar-stack.tsx`, `animated-number-flow.tsx`, `member-actions-toolbar.tsx`, `toolbar-icon-button.tsx` |
| Badges | `member-owner-badge.tsx`, `member-stripe-payer-badge.tsx`, `stripe-private-message-badge.tsx` |
| Ícones animados | `src/components/icons/` (~41 arquivos, Motion) — preferidos sobre Lucide na UI do produto |

### Layout da aplicação

```
Root layout
└── ThemeProvider + TooltipProvider + Toaster (Sonner)
    └── PrivacyConsentBanner

Auth layout — centralizado, auth-light-beams, tema light forçado

Private layout
└── DashboardShell (gradiente surface, p-2, h-svh)
    └── SidebarProvider (cookie-persisted)
        ├── AppSidebar (16rem expandido / 3.5rem colapsado)
        └── SidebarInset
            ├── Header (h-14, border-b) — SidebarTrigger + ThemeSwitcher + Profile
            └── main → Container (max-w-7xl, p-4)
```

Sidebar: seções Navegação, Conta, Legal. Ícones animados customizados no hover.

### Padrões de UI

#### Cards

- `rounded-xl shadow-sm ring-1 ring-foreground/10 bg-card`
- Variante `size="sm"` reduz padding
- Compound: `CardHeader`, `CardTitle` (`font-heading`), `CardDescription`, `CardContent`, `CardFooter`

#### Botões (variantes CVA)

| Variant | Uso |
|---------|-----|
| `default` | CTA primário — `bg-primary` |
| `outline` | Secundário, botões de fechar |
| `secondary` | Alternativa preenchida |
| `ghost` | Toolbar, ações sutis |
| `destructive` | Remover — tint vermelho suave, não sólido |
| `link` | Links inline |

Sizes: `xs`, `sm`, `default` (h-9), `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`. Prop `loading` para estado de carregamento.

#### Badges

Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`, `alert` (amber). Status semânticos: verde (ativo), amber (alerta).

#### Tabelas

`Table` primitives; header `text-xs text-muted-foreground font-medium h-9`; rows `hover:bg-muted`.

#### Dialogs

- Padrão: `Dialog` + `DialogContent` (`rounded-xl`, `max-w-md`, backdrop `bg-black/40`)
- Fluxos multi-step: `dialog-stack` (Kibo UI)
- Close: botão outline top-right com ícone X animado

#### Empty states

`Empty` compound — ícone, título, descrição, CTA. Usado em groups, alerts, integrations, members.

#### Formulários

- Simples: `useForm` + `zodResolver` + `FormField`
- Complexo: `Input`/`Textarea`/`Checkbox`/`Field` + seções `Card`
- Erros: `text-xs text-destructive` ou `FieldError`
- Invalid: `aria-invalid` → borda vermelha + ring
- Feedback: `toast.success/error` (Sonner)
- Tokens: `border-input`, `bg-background`, `text-foreground`, `text-muted-foreground`, `ring-primary/*`

#### Cores semânticas (além dos tokens)

| Significado | Classes típicas |
|-------------|-----------------|
| Sucesso/ativo | `green-50/700` (light), `green-950/400` (dark) |
| Alerta | amber + badge `alert` |
| Desconectado | tons `muted` |
| Selecionado/hover | `border-primary/40`, `bg-primary/5` |

#### Espaçamento e radius

| Elemento | Valor |
|----------|-------|
| Container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| Conteúdo página | `p-4` |
| Shell privado | `p-2` externo |
| Header | `h-14 px-4 sm:px-6` |
| Cards/dialogs | `rounded-xl` |
| Option cards | `rounded-2xl` |
| Inputs/buttons | `rounded-md` |
| Badges | `rounded-4xl` (pill) |

#### Animação

- Botões: `active:translate-y-px`
- Ícones nav: animam no hover via ref (`startAnimation`/`stopAnimation`)
- Theme switcher: `layoutId="activeTheme"` spring
- Dialogs: `animate-in/out fade + zoom` (`tw-animate-css`)

#### Ícones

- **Preferir** ícones animados em `src/components/icons/` (Motion)
- **Lucide** (`lucide-react`) apenas onde necessário (sidebar types, alguns internals shadcn)

### Arquivos-chave do design system

| Arquivo | Propósito |
|---------|-----------|
| `apps/web/components.json` | Config shadcn |
| `apps/web/src/app/globals.css` | Tokens + Tailwind v4 |
| `apps/web/postcss.config.mjs` | Pipeline PostCSS |
| `apps/web/src/app/layout.tsx` | Fonts + providers |
| `apps/web/src/components/ui/button.tsx` | Referência de variantes |
| `apps/web/src/lib/utils.ts` | `cn()` |

---

## Padrão de formulários (Zod + React Hook Form)

- Componentes interativos: **Client Components** (`"use client"`).
- Validação: **Zod** + `zodResolver`.
- Schema específico de tela: pode ficar no `_components` da rota; schema compartilhado: `src/lib/zod/`.
- `useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })`.
- Tipos: `z.infer<typeof schema>` ou `FormValues` explícito com factory `createSchema(mode)`.
- Erros: `formState.errors` nos campos.
- Inputs: tokens do tema + componentes shadcn (`Input`, `Field`, `Textarea`, etc.).
- Feedback: Sonner toasts; não simular backend em telas frontend-only.

---

## Segurança

- Nunca armazenar dados sensíveis de pagamento
- Criptografar chaves de API Stripe (`SECRET_ENCRYPTION_KEY` obrigatório em production)
- Validar todas as requisições externas com Zod
- Bot autentica na API via secret interno (`TELEGRAM_BOT_INTERNAL_SECRET`) — não exposto ao client
- Endpoints autenticados: `@UseGuards(AuthGuard)`; ownership sempre filtrado por `userId` no Prisma
- Rotas públicas intencionais (`POST /stripe-billing/checkout/finalize`, auth login/register): rate limit dedicado
- Logs anonimizados quando possível; não logar tokens, secrets ou PII desnecessária
- Sessões em cookie httpOnly (`gateon.session`)
- Sem `$queryRaw` / SQL concatenado — usar Prisma tipado

---

## Regras gerais

- Código modular; backend valida, frontend consome API
- Ações críticas com log
- Evitar dependência de serviços instáveis
- Arquivos > 200–300 linhas: considerar divisão
- Não sobrescrever `.env` sem confirmação do usuário
- **API:** novo módulo Nest → incluir testes unitários Jest no padrão de `AGENTS.md` → Testes unitários da API; rodar `npm test` em `apps/api` antes de concluir

---

## Melhorias futuras

- Pacote `packages/shared` para eliminar duplicação
- Billing Gateon wired ao `Users` (planos starter/pro)
- Webhooks Stripe em tempo real
- Mais gateways além de Stripe
- Relatórios avançados e antifraud
