# Migrações Pendentes

Lista viva das migrações arquiteturais conhecidas no v2 (SvelteKit + Tauri). Atualizar à medida que forem concluídas.

## Em aberto

### 1. Substituir mock repositories por HTTP repositories
**Status:** todos os módulos hexagonais (`auth`, `dashboard`, `models`, `rag`, `serverStatus`, `teams`) usam `XxxMockRepository`.
**Ação:** criar `XxxHttpRepository` em `lib/server/<modulo>/infrastructure/` e trocar a referência em `lib/server/<modulo>/index.ts`.
**Backends alvo:** Lambda Keycloak (auth), TrainingService (training/teams/server/models), Ares.Rag.Api (rag).
**Riscos:** mapeamento camelCase ↔ snake_case por backend. Tratar erros de rede e timeouts. Adicionar logs estruturados.

### 2. Auth real Keycloak (substituir cookie base64 por JWT)
**Status:** `(auth)/login/+page.server.ts` emite cookie `ia_trainner_session` com `btoa(JSON.stringify({ user, exp }))` — não é JWT real.
**Ação:** ao implementar `auth.http.repository.ts` apontando ao Lambda, mudar o action para armazenar o `access_token` real do Keycloak no cookie httpOnly e validar via `auth.repository.verifySession(token)` em `hooks.server.ts`.
**Implicação:** refresh token + auto-renew automático perto do `exp`.

### 3. Comandos Rust completos para Tauri
**Status:** `src-tauri/src/commands.rs` cobre auth e parte das operações. `lib/tauri.ts` declara `auth`, `training`, etc., mas alguns comandos podem ser stubs.
**Ação:** auditar `lib/tauri.ts` × `commands.rs` e implementar os comandos faltantes em Rust com chamada HTTP real aos microsserviços.
**Riscos:** Tauri Store é por-OS; testar persistência em iOS/Android.

### 4. Stack de testes
**Status:** Vitest, `@testing-library/svelte` e Playwright NÃO instalados.
**Ação:** `npm i -D vitest @testing-library/svelte jsdom @playwright/test`, adicionar `scripts.test` e `scripts.test:e2e` em `package.json`, criar `vitest.config.ts`.
**Cobertura mínima inicial:** casos de uso em `lib/server/<modulo>/application/` + componentes do design system.

### 5. Atoms / Molecules / Templates do design system
**Status:** existe apenas `design-system/organisms/` (Sidebar, Notifications). Atoms/molecules/templates não foram criados.
**Ação:** extrair padrões repetidos das pages atuais (botões, badges, inputs, cards, alerts, page-headers, AppLayout) conforme regra dos 3+ usos.

### 6. PathBase / deploy público
**Status:** v2 não está deployada. Versão antiga (Blazor) ainda atende `https://victorpersike.dev.br/ia-trainner/`.
**Ação:** definir estratégia de deploy SSR (Node container no K8s) com `paths.base = '/ia-trainner'` configurado. Substituir o frontend Blazor.

### 7. Service Worker / offline (Tauri)
**Status:** sem suporte offline planejado.
**Ação:** decidir se vale gastar com cache de leitura no Tauri Store (lista de modelos, jobs recentes). Não-bloqueador.

### 8. Telemetria / observabilidade
**Status:** ausente no client.
**Ação:** decidir entre Sentry, OpenTelemetry web, ou nada. Backend já tem OTEL — pode emitir traces do SSR para o mesmo collector.

## Concluídas

- ~~Migração de Blazor MVVM .NET → SvelteKit + Tauri~~ — 2026-04-27
- ~~Arquitetura Dual-Mode (SSR + SPA Tauri)~~
- ~~Auth via cookie httpOnly (Web) e Tauri Store (Tauri)~~
- ~~Hexagonal por módulo em `lib/server/<modulo>/`~~
- ~~Service Layer Dual-Mode com `isTauri()`~~
