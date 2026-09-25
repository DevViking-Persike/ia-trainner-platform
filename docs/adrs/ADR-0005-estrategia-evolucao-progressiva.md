# ADR-0005 — Arquitetura Hexagonal SSR + SPA Tauri

## Status
Aceito · Implementado parcialmente (mocks ainda em todos os módulos)

## Data
2026-04-27

## Contexto
A migração do v1 (Blazor) para o v2 (SvelteKit + Tauri) é a oportunidade de organizar a lógica de negócio com fronteiras claras desde o início. No v1, lógica de service e infraestrutura (HTTP, MongoDB) estavam misturadas em `IATrainner.Web/Services/` e `IATrainner/Services/` — testar exigiu mocks pesados e refactors.

Queremos:
- Trocar mock por HTTP repository sem tocar em UI ou caso de uso.
- Casos de uso testáveis sem rede ou DB.
- Separação clara entre Web (SSR) e Tauri (SPA + Rust) que compartilham domínio.

## Decisão
Adotar **Hexagonal por módulo** em `src/lib/server/<modulo>/` com 3 camadas:

```
src/lib/server/<modulo>/
├── domain/                # tipos + interface do repository
│   ├── <modulo>.types.ts
│   └── <modulo>.repository.ts
├── application/           # casos de uso (business logic)
│   └── <usecase>.ts
├── infrastructure/        # implementações concretas
│   ├── <modulo>.mock.repository.ts     # fase atual
│   └── <modulo>.http.repository.ts     # objetivo
└── index.ts               # composition root: instancia mocks/HTTP e os UseCases
```

Módulos atuais: `auth`, `dashboard`, `models`, `rag`, `serverStatus`, `teams`.

**Regras:**
- `application/` só conhece interfaces de `domain/`. Nunca importa `infrastructure/`.
- `infrastructure/` implementa interfaces de `domain/`. Nunca importa `application/`.
- `index.ts` é o **composition root** manual — instancia repository concreto e injeta nos casos de uso.
- Apenas `+page.server.ts` (e `hooks.server.ts`) podem importar de `$lib/server/...`. Cliente (Svelte, services, stores) **NUNCA**.

Para o **Tauri (SPA)**, a lógica equivalente vive em Rust (`src-tauri/src/commands.rs`) e é exposta ao client via `lib/tauri.ts`. O contrato compartilhado entre Web e Tauri vive em `lib/services/<modulo>.service.ts` (interface única, factory `isTauri()`).

## Alternativas consideradas
- **Lógica direto em `+page.server.ts`** — descartado: vira monolito, intestável, fácil de quebrar invariantes.
- **DDD completo (aggregates / events / sagas)** — descartado: overkill para um app frontend que delega regras pesadas a microsserviços externos.
- **Compartilhar lógica entre Web SSR e Tauri (em TypeScript)** — descartado: contextos de runtime e segurança diferentes (Tauri tem acesso ao FS, Web não; Web tem cookie httpOnly, Tauri não). Compartilhar apenas tipos.

## Consequências
**Ganhos**
- Caso de uso testável só com mock do repository — sem rede, sem DB.
- Trocar `XxxMockRepository` por `XxxHttpRepository` é mudança de uma linha em `index.ts`.
- Domínio fica blindado contra mudanças de infra (refactor de fetch / SDK).

**Trade-offs**
- Mais arquivos por feature (3 pastas + composition root).
- Curva de leitura maior para devs não familiarizados com Hexagonal/Clean.
- Duplicação parcial entre lógica TS (Web) e Rust (Tauri) — necessária por runtime, mas exige sincronia.

## Impacto em código, testes e operação
- **Hoje**: todos os módulos usam `XxxMockRepository`. Migração para HTTP é a pendência principal (ver `.claude/rules/08-migracoes-pendentes.md` item 1).
- **Testes**: casos de uso são alvo prioritário (`ADR-0004`).
- **Documentação**: `docs/architecture/frontend/02-architecture-map.md` detalha as dependências entre camadas.
- **Operação**: trocar mock por HTTP exige variáveis de ambiente (`AUTH_BASE_URL` etc) configuradas no deploy SSR.

## ADRs relacionados
- ADR-0001 — Adoção SvelteKit + Tauri
- ADR-0004 — Estratégia de testes
- ADR-0006 — Auth via Cookie httpOnly + Tauri Store
