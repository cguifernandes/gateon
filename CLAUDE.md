@AGENTS.md

## Gateon (Claude / Cursor) — same rules, short list

1. **Page-only UI** → colocate under that page’s `_components` (split into multiple files as needed; keep page context inside that folder only).
2. **Shared across routes** → `src/components/` (or the project’s shared folder), not page `_components`.
3. **English** for filenames, components, types, variables, and comments; product UI text may be localized, identifiers stay English.
4. **Zod schemas** → always create in `src/lib/zod/` (auth schemas must stay in `src/lib/zod/auth-schemas.ts`).

## Contexto do produto

Siga também o contexto completo em `AGENTS.md` com:
- visão geral e objetivo do sistema de automação de acesso por assinatura;
- regras de bot e integração com gateways;
- diretrizes de segurança, lógica de assinatura e mensagens automáticas;
- limitações, fluxo resumido e melhorias futuras.

## Padrão de formulários

Para novas telas com formulário, siga o padrão documentado em `AGENTS.md`: Client Component, `react-hook-form`, schema em `zod`, `zodResolver`, `defaultValues`, mensagens via `formState.errors` e campos usando tokens do tema/shadcn.
