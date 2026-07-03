# API

## Stack

- NestJS 11
- Prisma 7
- PostgreSQL
- Zod

## Estrutura

- modules/<name>/
- lib/
- lib/zod/

## Regras

- Um módulo por feature.
- Não criar helpers duplicados.
- Preferir funções puras em lib/.
- Controllers apenas orquestram.
- Services não devem exceder ~300 linhas.

## DRY

Antes de criar:

- Service
- Helper
- Query Prisma
- Endpoint

Pesquisar primeiro no projeto e reutilizar.

## Testes

- Todo módulo possui `<name>.spec.ts`.
- Não criar `lib/**/*.spec.ts`.
- Helpers são testados no spec do módulo.