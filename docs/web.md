# Web

## Stack

- Next.js 16
- React 19
- Tailwind v4
- shadcn/ui

## Estrutura

- UI da rota → `_components`
- Compartilhado → `src/components`
- Hooks → `src/hooks`
- Schemas → `lib/zod`

## DRY

Antes de criar:

- Componentes
- Hooks
- Utils
- Fetches

Pesquisar primeiro.

## Padrões

- Server Components primeiro.
- Server Actions para mutations.
- Client Components apenas quando necessário.
- Componentes até ~300 linhas.