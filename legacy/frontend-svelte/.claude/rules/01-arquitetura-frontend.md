# Regras de Arquitetura Frontend

**Objetivo:** Manter a separação SvelteKit (UI) ↔ Hexagonal (server-side business) ↔ Tauri (Rust shell), sem vazamento entre camadas.

## Stack alvo
- **SvelteKit 2** + **Svelte 5** (runes: `$state`, `$props`, `$derived`, `$effect`)
- **TypeScript** estrito
- **Tauri 2** para desktop/mobile (SPA com `adapter-static`)
- **Adapter dinâmico** em `svelte.config.js` (`auto` para Web SSR, `static` quando `TAURI_ENV_ARCH` setado)

## Obrigatório

- Toda página com lógica de negócio DEVE delegar a um caso de uso em `src/lib/server/<modulo>/application/<UseCase>.ts`. Páginas só orquestram UI.
- Casos de uso DEVEM receber dependências (`repository`) por construtor — sem `import` direto de `infrastructure`.
- Interfaces de repository DEVEM viver em `src/lib/server/<modulo>/domain/<modulo>.repository.ts`.
- Implementações HTTP/mock DEVEM viver em `src/lib/server/<modulo>/infrastructure/`.
- Composition root é o `index.ts` de cada módulo (`src/lib/server/<modulo>/index.ts`) — única coleção que conhece a implementação concreta.
- Tipos de domínio (entidades, DTOs) DEVEM viver em `src/lib/server/<modulo>/domain/<modulo>.types.ts`.
- Direção de dependência: `+page.svelte` → `+page.server.ts` (load/action) → `useCase.execute()` → `repository` (interface) → backend.
- `+page.server.ts` é o **único** lugar que importa de `$lib/server/...`. NUNCA importar `$lib/server/*` em arquivos `.svelte` ou em `$lib/services/*` (cliente).
- Componentes Svelte DEVEM usar **runes**: `$state()`, `$props()`, `$derived()`. **PROIBIDO** `export let` legado, `$:` reativo legado e `<script>` sem `lang="ts"`.
- Toda nova página/feature DEVE existir em ambos os modos: SSR (form actions / loaders) **e** Tauri (Rust commands em `src-tauri/src/commands.rs` + wrapper em `src/lib/tauri.ts`).

## Permitido

- Páginas pequenas (apenas leitura, sem mutação) PODEM ler dados via `+page.server.ts` `load` direto (sem caso de uso) se a operação é trivial e não tem regra de negócio.
- Stores (`$lib/stores/`) PODEM expor estado client-side derivado (auth corrente, tema, notificações) — sem regra de negócio.
- `infrastructure/<modulo>.mock.repository.ts` é ACEITÁVEL durante a fase de transição até HTTP repository ficar pronto. Marcar como `TODO: trocar por http repository` no `index.ts`.

## Proibido

- PROIBIDO importar `$lib/server/*` em código que roda no cliente (qualquer `.svelte`, `$lib/services/*`, `$lib/stores/*`, `$lib/tauri.ts`). SvelteKit já bloqueia, mas NÃO contornar com hacks.
- PROIBIDO instanciar repository diretamente em casos de uso ou pages — sempre via `index.ts` (composition root).
- PROIBIDO colocar lógica de negócio em `+page.svelte`. Validações, regras, transformações: caso de uso ou repository.
- PROIBIDO chamar HTTP/`fetch` direto de pages ou stores. HTTP é responsabilidade de `infrastructure/<modulo>.http.repository.ts` no server, ou de `src-tauri/src/commands.rs` em Tauri.
- PROIBIDO usar `export let` em componentes novos. Tudo via `$props()`.
- PROIBIDO criar lógica que só funciona em um dos modos (Web ou Tauri) sem o equivalente no outro — quebra Dual-Mode.

## Sinais de alerta

- `+page.svelte` com mais de 30 linhas em `<script>` sem extrair nada para `+page.server.ts` ou store.
- Caso de uso recebendo mais de 3 dependências — provável falta de segregação.
- `import` de `$lib/server/...` aparecendo em arquivo client-side (vai estourar no build).
- `infrastructure/` importando coisas de `application/` ou `domain/` na direção errada.
- Componente Svelte misturando `export let` (legado) com `$props()` (runes) no mesmo arquivo.
