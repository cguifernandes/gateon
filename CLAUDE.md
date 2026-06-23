@AGENTS.md

## Gateon (Claude / Cursor) — regras rápidas

Documento canônico completo: **`AGENTS.md`**. Este arquivo resume o essencial para agentes no Cursor.

### Convenções de código

1. **UI só de uma rota** → `_components` da página; **compartilhada** → `src/components/`.
2. **Inglês** em filenames, tipos, variáveis e comentários; UI do produto pode ser `pt-BR`.
3. **Zod** → `apps/web/src/lib/zod/` (web) ou `apps/api/src/lib/zod/` (API).
4. **Nest API** → `modules/<name>/` com **apenas** `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.spec.ts`; registrar em `app.module.ts` — ver `AGENTS.md`.
5. **Lint:** Biome (web/bot), ESLint+Prettier (api).

### Monorepo (3 apps)

| App | Stack | Porta |
|-----|-------|-------|
| `apps/web` | Next.js 16, React 19, Tailwind 4, shadcn v4 | 3000 |
| `apps/api` | NestJS 11, Prisma 7, PostgreSQL | 4000 |
| `apps/bot` | Grammy, ESM | — |

- `npm run dev` → web + api; `npm run dev:bot` → bot separado.
- Web → API via cookie `gateon.session`; Bot → API via `x-gateon-bot-secret`.
- Sem `packages/shared` — código duplicado entre apps deve ficar em sync (ver AGENTS.md).

### Produto (estado atual)

Automação de acesso a grupos Telegram pagos via Stripe:

- Conexão de grupos via bot (`/start` com token)
- Stripe read-only: sync, métricas, checkout via bot, vínculo grupo↔plano
- Alertas automatizados (Telegram + Stripe)
- Bot start settings: mensagem `/start` personalizada com planos e botões de pagamento
- Dashboard, membros, limites de plano (`free`/`starter`/`pro` — todos em `free` hoje)

**Não faz:** processar pagamentos, criar assinaturas, armazenar dados sensíveis.

### Rotas privadas principais

`/dashboard` · `/groups` · `/groups/[id]/bot` · `/members` · `/alerts` · `/integrations` · `/settings`

### Design system (resumo)

| Item | Valor |
|------|-------|
| shadcn style | `base-nova`, base color `neutral` |
| Tailwind | v4, config em `globals.css` (sem tailwind.config.js) |
| Primitivos | Base UI (`@base-ui/react`) |
| Fontes | Inter (corpo) + Geist Sans (títulos) |
| Primary | `oklch(0.55 0.2 255)` ≈ `#3b82f6` |
| Tokens extras | Paleta `surface-*` (Material-like) |
| Ícones | Animados custom (`src/components/icons/`) > Lucide |
| Layout | Sidebar colapsável + header; `Container max-w-7xl` |
| Cards | `rounded-xl shadow-sm ring-1 ring-foreground/10` |
| Tema | next-themes; privado = system/light/dark; auth = light forçado |
| Toasts | Sonner; formulários = RHF + Zod + `FormField`/`Field` |

Detalhes completos de tokens, componentes ui/, padrões de botão/badge/tabela/dialog: **`AGENTS.md` → Design System**.

### Formulários

Client Component + `react-hook-form` + `zodResolver` + schema Zod + `defaultValues` + erros via `formState.errors` + tokens shadcn (`border-input`, `bg-background`, `ring-primary/*`).

### Ao alterar regras compartilhadas

Sincronizar entre apps: `plan-limits`, `telegram-admin-rights`, `bot-start-message-builder`, `bot-start-subscribe-steps`, schemas Zod espelhados. Lista completa em **`AGENTS.md` → Código sincronizado**.
