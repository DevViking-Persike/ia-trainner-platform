# ADR-0001 — Adoção de SvelteKit + Tauri Dual-Mode como Frontend

## Status
Aceito · Implementado

## Data
2026-04-27

## Contexto
O frontend original (Blazor Server + MAUI Blazor Hybrid) entregava Web e mobile/desktop a partir de um único codebase .NET, mas acumulou problemas:

- Acoplamento implícito entre Blazor Server e MAUI exigia duplicação dolorosa de implementações de service para cada plataforma, com diferenças sutis de DI lifecycle e auth.
- Cold start de Blazor Server e SignalR circuits limitam UX em redes ruins.
- Onboarding de devs front-end exigia conhecimento de Razor + .NET; ecossistema Web (CSS, build tools, design systems) é mais maduro fora de .NET.
- Necessidade de empacotar app desktop e mobile com binário pequeno, sem Mono/MAUI runtime pesado.
- Convergência: o ecossistema Tauri 2 (Rust shell + WebView) entregava mobile (Android/iOS) com bundle de poucos MBs, enquanto SvelteKit 2 + Svelte 5 oferece SSR + SPA no mesmo codebase.

## Decisão
Adotar **SvelteKit 2 + Svelte 5 + Tauri 2** como frontend único em arquitetura **Dual-Mode**:

- **Web (SSR)**: `@sveltejs/adapter-auto` rodando em Node, auth via cookie httpOnly + form actions, lógica server em `src/lib/server/<modulo>` (Hexagonal).
- **Desktop / Mobile (SPA)**: `@sveltejs/adapter-static`, auth via Tauri Store, lógica nativa em Rust (`src-tauri/src/commands.rs`).
- A escolha do adapter é dinâmica em `svelte.config.js` baseada em `process.env.TAURI_ENV_ARCH`.
- Service Layer (`src/lib/services/`) usa `isTauri()` como router de implementação para unificar a interface vista pelas pages.

## Alternativas consideradas
- **Manter Blazor Server + MAUI** — descartado pelo custo de duplicação de services (Web vs MAUI), complexidade de DI lifecycle, e dependência de runtime .NET no client mobile.
- **Next.js + Capacitor** — descartado por DX inferior à de SvelteKit + Tauri (bundle maior, runtime Node no mobile, ergonomia menos integrada).
- **Astro + Tauri** — descartado por imaturidade de SSR-first com dados autenticados frequentes.
- **Flutter Web + Mobile** — descartado por ergonomia diferente (Dart) e ecossistema Web limitado.

## Consequências
**Ganhos esperados**
- Um único codebase atende Web SSR + Desktop + iOS + Android, com adapter dinâmico.
- Bundle Tauri ~10-30 MB vs MAUI Blazor 100+ MB.
- TypeScript estrito + Svelte 5 runes simplifica reatividade.
- Hexagonal real no server isola domínio de infra (mock ↔ HTTP trocável).

**Trade-offs aceitos**
- Curva de aprendizado: SvelteKit + Svelte 5 runes para devs vindos de Blazor.
- Duplicação intencional entre `WebXxxService` (form actions) e `TauriXxxService` (invoke) — runtimes diferentes.
- Comandos Rust em `src-tauri/src/commands.rs` adicionam camada extra para implementar e manter.

**Custos / riscos**
- Risco de drift entre comportamento Web e Tauri se um dos lados ficar desatualizado.
- Tauri 2 mobile (iOS/Android) é mais novo — algumas APIs ainda em evolução.
- Reescrita completa do frontend exigiu reimplementar todas as features em Svelte.

## Impacto em código, testes e operação
- **Código**: removidos `IATrainner/`, `IATrainner.Web/`, `IATrainner.Shared/` e respectivos `.Tests`. Toda UI agora na raiz do submodule `Frontend/` (após reorganização de 2026-04-28; anteriormente vivia em `ia-trainner-v2/`).
- **Auth**: cookie `ia_trainner_session` (httpOnly, base64 de `{ user, exp }`) decodificado em `hooks.server.ts` para Web; Tauri Store + comandos Rust para Tauri.
- **Documentação**: regras refeitas em `.claude/rules/01-08`, ADRs reescritos a partir desta data, análise e arquitetura em `docs/architecture/frontend/` reescritas.
- **Operação**: deploy SSR ainda pendente (versão Blazor antiga continua atendendo `https://victorpersike.dev.br/ia-trainner/` até substituição).
- **Testes**: stack alvo é Vitest + `@testing-library/svelte` + Playwright; ainda não instalada.

## ADRs relacionados
- ADR-0002 — Governança do Design System Svelte
- ADR-0005 — Arquitetura Hexagonal SSR + SPA
- ADR-0006 — Auth via Cookie httpOnly + Tauri Store
