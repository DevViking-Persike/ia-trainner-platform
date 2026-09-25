# 03 — Estrutura de Pastas

**Última atualização:** 2026-04-27

## Top-level (`Frontend/`)

```
Frontend/
├── CLAUDE.md                  # Contexto Claude Code
├── README.md                  # Overview + comandos
├── .claude/
│   ├── commands/              # Slash commands (/project:fe-*)
│   └── rules/                 # 8 regras vinculantes (01-08)
├── docs/
│   ├── adrs/                  # ADRs + TEMPLATE
│   ├── analysis/              # Diagnóstico (audit + frontend/01-07 + improvement-plan)
│   ├── architecture/frontend/ # Arquitetura (00-10)
│   └── review/                # Reviews periódicos (code, quality, perf, sec, testes, etc.)
├── scripts/                   # Orquestração (web/, full-stack/, android/, ios/, macos/, _common.sh, README.md)
├── package.json
├── package-lock.json
├── svelte.config.js           # Adapter dinâmico (auto vs static)
├── vite.config.js             # Vite + porta 1420
├── tsconfig.json              # strict mode
├── static/                    # Assets estáticos (favicon, etc.)
├── build/                     # Output (gitignored)
├── src/                       # Código SvelteKit (detalhe abaixo)
└── src-tauri/                 # Rust shell (detalhe abaixo)
```

## Código SvelteKit (`src/`)

```
src/
├── app.css                    # Design tokens (~800 linhas, dark-first)
├── app.html                   # Shell HTML SvelteKit
├── app.d.ts                   # Tipos globais (locals, etc.)
├── hooks.server.ts            # Auth guard SSR
├── lib/
│   ├── types.ts               # Tipos compartilhados
│   ├── tauri.ts               # Wrapper invoke() tipado
│   ├── stores/                # auth.ts, theme.ts, notifications.ts
│   ├── services/              # auth, dashboard, models, platform, rag, server-status, teams, training (.service.ts)
│   ├── design-system/
│   │   ├── atoms/             # (vazio)
│   │   ├── molecules/         # (vazio)
│   │   ├── organisms/         # Sidebar.svelte, Notifications.svelte
│   │   └── templates/         # (vazio)
│   └── server/                # Hexagonal — apenas SSR
│       ├── auth/
│       │   ├── domain/
│       │   │   ├── auth.types.ts
│       │   │   └── auth.repository.ts
│       │   ├── application/
│       │   │   ├── authenticate-user.ts
│       │   │   └── register-user.ts
│       │   ├── infrastructure/
│       │   │   └── auth.mock.repository.ts
│       │   └── index.ts       # Composition root
│       ├── dashboard/
│       ├── models/
│       ├── rag/
│       ├── serverStatus/
│       └── teams/
└── routes/
    ├── +layout.svelte
    ├── (auth)/
    │   ├── login/+page.svelte, +page.server.ts
    │   ├── cadastro/+page.svelte, +page.server.ts
    │   ├── logout/+page.server.ts
    │   └── verificar-email/+page.svelte
    └── (app)/
        ├── +layout.svelte (com Sidebar)
        ├── +page.svelte, +page.server.ts (dashboard)
        ├── models/+page.svelte, +page.server.ts
        ├── models/chat/+page.svelte
        ├── profile/+page.svelte
        ├── rag/+page.svelte, +page.server.ts
        ├── rag/chat/+page.svelte
        ├── server/+page.svelte, +page.server.ts
        ├── teams/+page.svelte, +page.server.ts
        └── training/+page.svelte
```

## Tauri shell (`src-tauri/`)

```
src-tauri/
├── Cargo.toml
├── Cargo.lock
├── build.rs
├── tauri.conf.json
├── capabilities/              # Permissões Tauri 2 (JSON)
├── icons/                     # PNG/ICNS/ICO
├── gen/                       # Geração mobile (Android/iOS)
└── src/
    ├── main.rs                # Entry point
    ├── lib.rs                 # Setup, plugins, generate_handler!
    ├── commands.rs            # 30 #[tauri::command]
    └── models.rs              # Structs Rust (espelho de types.ts)
```

## Convenções de nomes

| Tipo | Convenção | Exemplos |
|------|-----------|----------|
| Componente | `PascalCase.svelte` | `Sidebar.svelte`, `Notifications.svelte` |
| Service | `kebab-case.service.ts` | `auth.service.ts`, `server-status.service.ts` |
| Module hexagonal | `camelCase` | `lib/server/auth/`, `lib/server/serverStatus/` |
| Use case | `kebab-case.ts` (verbo + alvo) | `authenticate-user.ts`, `get-server-status.ts` |
| Repository (interface) | `<modulo>.repository.ts` | `auth.repository.ts` |
| Repository (impl) | `<modulo>.<tipo>.repository.ts` | `auth.mock.repository.ts`, `auth.http.repository.ts` |
| Tipos | `<modulo>.types.ts` | `auth.types.ts` |
| Rota | kebab-case | `verificar-email`, `meu-perfil` |

## Convenções de import

```typescript
// Em +page.server.ts (Web SSR):
import { authDependencies } from '$lib/server/auth';

// Em +page.svelte (cliente):
import { isTauri } from '$lib/services/platform';
import { authStore } from '$lib/stores/auth';

// Em service:
import { auth as tauriAuth } from '$lib/tauri';

// Em commands.rs (Rust):
use crate::models::AuthUserInfo;
use tauri::State;
```

> Não usar imports relativos longos (`../../../`). Sempre via `$lib/*`.

## Arquivos ignorados (.gitignore)

- `node_modules/`
- `.svelte-kit/`
- `build/`
- `bin/`, `obj/` (legado .NET — pode ser removido do `.gitignore` em refactor futuro)
- `.env*` (exceto `.env.example` se vier a existir)
- `src-tauri/target/`
- `.vscode/`
- `.DS_Store`
