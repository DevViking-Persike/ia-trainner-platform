# 01 — Mapeamento Inicial do Frontend (v2)

**Data:** 2026-04-27
**Escopo:** SvelteKit 2 + Svelte 5 + Tauri 2 na raiz do `Frontend/`.

## Stack confirmada

| Camada | Versão / ferramenta |
|--------|---------------------|
| UI framework | SvelteKit `^2.9.0` + Svelte `^5.0.0` (runes) |
| Linguagem | TypeScript `~5.6.2` (strict) |
| Bundler | Vite `^6.0.3` |
| Type-check | svelte-check `^4.0.0` |
| Shell desktop/mobile | Tauri `^2` (Cargo workspace em `src-tauri/`) |
| Plugins Tauri | `@tauri-apps/plugin-store ^2.4.2`, `@tauri-apps/plugin-opener ^2` |
| Adapter dinâmico | `adapter-auto ^7.0.1` (Web SSR) ↔ `adapter-static ^3.0.6` (Tauri SPA) |

## Estrutura de pastas mapeada

```
Frontend/                       # raiz do submodule
├── package.json
├── svelte.config.js          # adapter dinâmico (auto vs static)
├── vite.config.js            # porta 1420 fixa, ignora src-tauri/
├── tsconfig.json             # strict
├── src/
│   ├── app.css               # 800 linhas, dark-first
│   ├── app.html
│   ├── app.d.ts
│   ├── hooks.server.ts       # auth guard SSR
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── (auth)/
│   │   │   ├── login/         (+page.svelte, +page.server.ts)
│   │   │   ├── cadastro/      (+page.svelte, +page.server.ts)
│   │   │   ├── logout/        (+page.server.ts)
│   │   │   └── verificar-email/ (+page.svelte)
│   │   └── (app)/
│   │       ├── +layout.svelte
│   │       ├── +page.svelte / +page.server.ts   (dashboard)
│   │       ├── models/        (lista + chat/)
│   │       ├── profile/
│   │       ├── rag/           (lista + chat/)
│   │       ├── server/
│   │       ├── teams/
│   │       └── training/
│   └── lib/
│       ├── server/<modulo>/   (auth, dashboard, models, rag, serverStatus, teams)
│       │   ├── domain/
│       │   ├── application/
│       │   └── infrastructure/
│       ├── services/          (8 services + platform helper)
│       ├── stores/            (auth, theme, notifications)
│       ├── design-system/
│       │   └── organisms/     (Sidebar, Notifications)
│       ├── tauri.ts
│       └── types.ts
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/
    └── src/
        ├── main.rs
        ├── lib.rs
        ├── commands.rs        (~367 linhas, 30 comandos)
        └── models.rs
```

## Routes — inventário

### Grupo `(auth)` (público)
| Rota | Arquivos | Carga |
|------|----------|-------|
| `/login` | `+page.svelte`, `+page.server.ts` | Action emite cookie httpOnly via `authDependencies.authenticateUser` |
| `/cadastro` | `+page.svelte`, `+page.server.ts` | Action chama `authDependencies.registerUser` |
| `/logout` | `+page.server.ts` | Limpa cookie |
| `/verificar-email` | `+page.svelte` | Estática, sem server |

### Grupo `(app)` (autenticado, com Sidebar)
| Rota | Arquivos | Estado |
|------|----------|--------|
| `/` (dashboard) | `+page.svelte`, `+page.server.ts` | `dashboardDependencies.getOverview.execute()` (mock) |
| `/models` | `+page.svelte`, `+page.server.ts` | `modelsDependencies.useCases.executeGetAvailable()` |
| `/models/chat` | `+page.svelte` | Client-side, sem server |
| `/profile` | `+page.svelte` | Client-only; comment "Profile save is local-only for now (no backend endpoint)" |
| `/rag` | `+page.svelte`, `+page.server.ts` | Load + actions create/delete |
| `/rag/chat` | `+page.svelte` | Client-side |
| `/server` | `+page.svelte`, `+page.server.ts` | `serverStatusDependencies.getStatus.execute()` |
| `/teams` | `+page.svelte`, `+page.server.ts` | Load com `Promise.all()` para membros de N teams |
| `/training` | `+page.svelte` | Client-side, sem server |

### Layouts
- `+layout.svelte` (raiz)
- `(app)/+layout.svelte` (Sidebar + container)
- `(app)/+layout.server.ts` (provavelmente expõe session ao layout)

## Hexagonal — módulos servidor

6 módulos em `src/lib/server/`:

| Módulo | Domain | Application | Infrastructure |
|--------|--------|-------------|----------------|
| `auth` | `auth.types.ts` (`AuthUserInfo`), `auth.repository.ts` | `authenticate-user.ts`, `register-user.ts` | `auth.mock.repository.ts` |
| `dashboard` | `dashboard.repository.ts` | `get-dashboard-overview.ts` | `dashboard.mock.repository.ts` |
| `models` | `models.repository.ts` | `models.use-cases.ts` | `models.mock.repository.ts` |
| `rag` | `rag.repository.ts` | `rag.use-cases.ts` | `rag.mock.repository.ts` |
| `serverStatus` | `serverStatus.repository.ts` | `get-server-status.ts` | `serverStatus.mock.repository.ts` |
| `teams` | `teams.repository.ts` | `teams-use-cases.ts` | `teams.mock.repository.ts` |

**Composition root** em cada `index.ts`. Sem variação entre módulos quanto à forma de wire.

## Service Layer — inventário

`src/lib/services/`:

- `auth.service.ts` — interface + `WebAuthService` (stub que lança erro "uses form actions") + `TauriAuthService` (chama `lib/tauri.ts`)
- `dashboard.service.ts` — Web é stub (SSR usa load), Tauri chama `invoke('get_dashboard_overview')`
- `models.service.ts` — `getAvailable()`, `chat()`
- `rag.service.ts` — `getCollections()`, `createCollection()`, `uploadDocument()`, `query()`
- `server-status.service.ts` — `getStatus()`
- `teams.service.ts` — `getTeams()`, `createTeam()`, `inviteToTeam()`, `getMembers()`, `removeMember()`
- `training.service.ts` — CRUD de jobs + start/cancel/delete + `getServerStatus()`
- `platform.ts` — helpers `isTauri()`, `isWeb()`, `isServer()`
- `index.ts` — barrel exports

## Tauri Rust — inventário

`src-tauri/src/commands.rs` — 30 comandos `#[tauri::command]` cobrindo:

- **Auth (7)**: `login`, `register`, `restore_session`, `get_current_user`, `is_authenticated`, `logout`, `resend_verification`
- **Training (7)**: `get_jobs`, `get_job`, `create_job`, `start_job`, `cancel_job`, `delete_job`, `get_server_status`
- **Models (2)**: `get_available_models`, `chat_with_model`
- **RAG (~7)**: `get_collections`, `get_collection`, `create_collection`, `delete_collection`, `upload_document`, `query_rag`, e operações de chat history
- **Teams (5)**: `get_teams`, `create_team`, `invite_to_team`, `get_team_members`, `remove_member`
- **Theme (3)**: `get_theme`, `set_theme`, `toggle_theme`

Estado: **todos retornam mock** (dados hardcoded em Rust).

`src-tauri/src/lib.rs` registra plugins (`store`, `opener`) e o `generate_handler!` com os 30 comandos.

`src-tauri/src/models.rs` define structs Rust espelhando `src/lib/types.ts`.

`tauri.conf.json`:
- App ID: `dev.victorpersike.ia-trainner`
- Window: 1400x900 (min 900x600)
- DevURL: `http://localhost:1420`
- Bundle targets: desktop + iOS + Android (icons configurados)
- iOS team: `L9ZD989PDG` (hardcoded)

## Ausências relevantes

- ❌ Sem testes (`*.test.ts`, `*.spec.ts`, Vitest/Playwright não instalados)
- ❌ Sem CI/CD (`.github/workflows/` ausente)
- ❌ Sem Dockerfile (deploy SSR não containerizado ainda)
- ❌ Sem infra de i18n (UI 100% PT-BR hardcoded)
- ❌ Atoms / molecules / templates do design system (apenas `organisms/`)
- ❌ Logging estruturado em Rust (`env_logger` listado em Cargo.toml, mas sem `log::*` macros nos comandos)

## Próximos documentos da análise

- `02-diagnostico-arquitetural.md` — adesão à Hexagonal, Dual-Mode, regras
- `03-design-system.md` — tokens, componentes, padrões
- `04-mapa-reaproveitamento.md` — duplicação detectada e candidatos a extração
- `05-diagnostico-testes.md` — estado real (zero) e roadmap
- `06-regras-geradas.md` — referência cruzada das regras com o código
- `07-commands-gerados.md` — slash commands derivados do diagnóstico
- `improvement-plan.md` — plano consolidado de melhorias
