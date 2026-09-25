# 06 — Justificativa das Regras Geradas (v2)

**Data:** 2026-04-27
**Escopo:** Cruzar cada regra em `.claude/rules/01-08*.md` com a evidência real no código v2.

## Mapa rule × código

### 01 — Arquitetura Frontend
**Regra principal**: SvelteKit (UI) ↔ Hexagonal (`lib/server/<modulo>`) ↔ Tauri (Rust). Sem vazamento entre camadas.

**Evidências no código:**
- `src/lib/server/auth/index.ts` — composition root manual instanciando mocks + use cases.
- `src/lib/server/<modulo>/application/<usecase>.ts` — recebe repository por construtor, sem import de `infrastructure/`.
- `+page.server.ts` (ex: `(auth)/login`) é o único lugar que importa `$lib/server/auth`.
- Componentes Svelte usam `let { } = $props()`, `$state`, `$derived` — runes Svelte 5.

**Risco identificado**: `(app)/training/+page.svelte` carrega dados client-side sem `+page.server.ts` correspondente. Quando HTTP repos chegarem, vai precisar migrar.

### 02 — Design System
**Regra principal**: tokens em `app.css`, dark-first, atomic design.

**Evidências:**
- `src/app.css` (~800 linhas) com 60+ tokens: `--bg-*`, `--text-*`, `--color-*`, `--shadow-*`, `--gradient-*`, `--spacing-*`, `--radius-*`.
- `[data-theme="dark"]` e `[data-theme="light"]` ambos definidos.
- `Sidebar.svelte` e `Notifications.svelte` usam apenas `var(--*)` em estilos.

**Lacuna**: pastas `atoms/`, `molecules/`, `templates/` vazias — extração ainda não feita (ver `04-mapa-reaproveitamento.md`).

### 03 — Reaproveitamento
**Regra principal**: regra dos 3+ usos, atomic design, snippets Svelte 5.

**Evidências:**
- Sem componentes extraídos prematuramente — apenas 2 organisms.
- Pages usam markup próprio onde a duplicação ainda é menor que 3 ocorrências (em vários casos, ela JÁ é).

**Risco identificado**: `(app)/models/chat` e `(app)/rag/chat` têm UIs de chat similares mas não compartilham código — esperado (regras dizem extrair apenas quando 3+ ocorrências, e são apenas 2; mas avaliar consolidação).

### 04 — Testes
**Regra principal**: Vitest + Testing Library + Playwright.

**Evidências:**
- ❌ stack não instalada
- ❌ zero arquivos de teste
- Regra existe como contrato para quando começar

### 05 — Service Layer e HTTP
**Regra principal**: `isTauri()` factory, interface única, implementações separadas, `lib/tauri.ts` para invoke.

**Evidências:**
- `src/lib/services/platform.ts` tem `isTauri()` com guarda SSR.
- `auth.service.ts` tem `WebAuthService` (stubs com erro) + `TauriAuthService` + `getAuthService()` factory.
- `src/lib/tauri.ts` é o único wrapper de `invoke()`. Nenhum `invoke(...)` solto encontrado em arquivos `.svelte`.
- HTTP `fetch` em código client-side: NÃO encontrado.

### 06 — Segurança
**Regra principal**: cookie httpOnly (Web), Tauri Store (Tauri), sem token em `localStorage`, frontend não acessa banco.

**Evidências:**
- `(auth)/login/+page.server.ts:26` seta cookie `httpOnly: true, sameSite: 'lax'`.
- `hooks.server.ts:18` deleta cookie expirado.
- Tauri Store via `@tauri-apps/plugin-store` (`src-tauri/src/commands.rs`).
- `localStorage` para tokens: NÃO encontrado.
- Frontend conectando direto em DB: NÃO encontrado.

**Débito identificado**: cookie atual é base64 simples, não JWT. Migração planejada (ver `08-migracoes-pendentes.md` item 2).

### 07 — Rotas e Navegação
**Regra principal**: kebab-case, route groups `(app)` e `(auth)`, `+page.server.ts` para load/action.

**Evidências:**
- Estrutura segue 100% o esperado: `(app)/...`, `(auth)/...`.
- Rotas em kebab-case: `/verificar-email`, `/cadastro`, `/training`.
- Form actions usadas em `(auth)/login`, `(auth)/cadastro`, `(app)/rag` — sem API routes para formulários internos.
- `hooks.server.ts:30` guarda `/training`, `/rag`, `/server`, `/models`.

**Lacuna identificada**: `(app)/profile` e `(app)/teams` também são rotas autenticadas — `hooks.server.ts` precisa de `/profile` e `/teams` no guard. Atualmente confiam no fato de estarem no grupo `(app)` (que tem `+layout.server.ts`), mas isso não bloqueia request HTTP direta. Investigar.

### 08 — Migrações Pendentes
**Regra principal**: documenta migrações em aberto.

**Evidências (concluídas)**:
- ~~Migração Blazor → SvelteKit + Tauri~~
- ~~Auth via cookie httpOnly e Tauri Store~~
- ~~Hexagonal por módulo~~
- ~~Service Layer Dual-Mode~~

**Em aberto** (com evidência no código atual):
1. Substituir mocks por HTTP repositories (todos os 6 módulos).
2. Auth real Keycloak (substituir base64 por JWT).
3. Comandos Rust completos para Tauri (auditar `lib/tauri.ts` × `commands.rs` — alinhamento atual: ✓).
4. Stack de testes (Vitest + Playwright — não instalado).
5. Atoms / molecules / templates do design system.
6. Deploy público SSR.
7. Service Worker / offline (Tauri).
8. Telemetria / observabilidade.

## Regras com lacunas identificadas

| Rule | Lacuna | Sugestão |
|------|--------|----------|
| 02 (Design System) | Sem escala tipográfica em tokens | Adicionar `--font-size-*` |
| 03 (Reaproveitamento) | Pastas atoms/molecules/templates vazias | Iniciar extração (ver `04-mapa-reaproveitamento.md`) |
| 04 (Testes) | Stack não instalada | Instalar Vitest + Playwright |
| 06 (Segurança) | Cookie não-JWT | Migrar para JWT real ao implementar `auth.http.repository.ts` |
| 07 (Rotas) | Guard em `hooks.server.ts` não cobre `/profile` e `/teams` | Adicionar prefixos ao guard |

## Conclusão

As regras refletem o código real com poucas divergências, e as divergências estão **explicitamente declaradas** em `08-migracoes-pendentes.md`. Documentação está em sincronia.
