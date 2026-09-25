# IA Trainner — Frontend

## Visão Geral
**IA Trainner** é uma plataforma para acadêmicos treinarem modelos de IA local e criarem RAG para estudar e analisar pesquisas.

Frontend único em **SvelteKit 2 + Svelte 5 + Tauri 2**, em arquitetura **Dual-Mode** (Web SSR + Desktop/Mobile SPA). Todo o código vive na raiz do `Frontend/` (após reorganização — antes ficava em `ia-trainner-v2/`).

## Arquitetura (Dual-Mode SSR + SPA)

| Modo | Adapter | Onde roda | Auth | Como acessa backend |
|------|---------|-----------|------|---------------------|
| **Web** | `@sveltejs/adapter-auto` (Node SSR) | Browser + servidor Node | Cookie `httpOnly` + `hooks.server.ts` | Form actions em `+page.server.ts` chamam casos de uso em `src/lib/server/<modulo>/application` |
| **Desktop / Mobile** | `@sveltejs/adapter-static` (SPA) | Tauri 2 (Rust shell) | Token em Tauri Store + Rust commands | `invoke()` via `src/lib/tauri.ts` para Rust em `src-tauri/src/commands.rs` |

A escolha do adapter é dinâmica em `svelte.config.js` (`process.env.TAURI_ENV_ARCH`).

### Camadas

```
src/
├── app.css                       # Design tokens (800 linhas, dark-first)
├── app.html                      # Shell HTML do SvelteKit
├── hooks.server.ts               # Auth guard SSR + decodificação de cookie
├── routes/                       # Páginas (groups: (app), (auth))
├── lib/
│   ├── server/<modulo>/          # Hexagonal (apenas server-side)
│   │   ├── domain/               # tipos + interface do repository
│   │   ├── application/          # casos de uso (business logic)
│   │   └── infrastructure/       # repositories (mock | HTTP p/ microsserviços)
│   ├── services/                 # Service Layer Dual-Mode (isTauri() router)
│   ├── stores/                   # Stores Svelte (auth, theme, notifications)
│   ├── design-system/            # atoms / molecules / organisms / templates
│   ├── tauri.ts                  # wrapper tipado de invoke() — só Tauri
│   └── types.ts                  # tipos de domínio compartilhados
└── ...
src-tauri/
├── src/                          # Rust (commands.rs, lib.rs, models.rs)
├── capabilities/                 # permissões Tauri 2
├── tauri.conf.json
└── Cargo.toml
```

Módulos hexagonais existentes: `auth`, `dashboard`, `models`, `rag`, `serverStatus`, `teams`.

## Stack
- **SvelteKit** 2.x · **Svelte** 5 (runes: `$state`, `$props`, `$derived`)
- **TypeScript** ~5.6 · **Vite** 6
- **Tauri** 2 (plugins: `opener`, `store`) · Cargo workspace em `src-tauri/`
- **Package manager**: `npm` (consistente com `tauri.conf.json`)

## Comandos
```bash
cd Frontend

npm install
npm run dev            # SSR Web (Vite, porta 1420)
npm run build          # Build Web (Node SSR)
npm run check          # svelte-check + tsc

npm run tauri:dev      # Desktop (Tauri abre janela 1400x900)
npm run tauri:build    # Bundle desktop (.dmg / .msi / .AppImage)

npm run tauri:android:dev      # Android
npm run tauri:android:build
npm run tauri:ios:dev          # iOS (precisa Xcode)
npm run tauri:ios:build
```

Scripts de orquestração em `scripts/` (ver `scripts/README.md`).

## Backends (repo `ia-trainner-microservico`)

| Serviço | Onde roda | URL | Uso |
|---------|-----------|-----|-----|
| KeycloakService | AWS Lambda | API Gateway `t1d5krmt04.execute-api.sa-east-1.amazonaws.com` | Login, registro, verificação de email |
| TrainingService | K8s Ganesha | `http://ia-trainner-training-service.apps:5200` | Jobs, equipes, server status, chat com modelos |
| Ares.Rag.Api | K8s Ganesha | `http://ares-rag-service.apps:8001` | Workspaces RAG, upload, query |
| Ollama | Ganesha | `:11434` (via TrainingService / Ares.Rag.Api) | Modelos LLM e embeddings |

URLs em variáveis de ambiente (`$env/dynamic/private`): `AUTH_BASE_URL`, `TRAINING_BASE_URL`, `RAG_BASE_URL`. **NUNCA** no client.

### Regra crítica: Frontend NUNCA acessa banco direto
Todo dado vem via HTTP API. Sem MongoDB, PostgreSQL ou Qdrant client no frontend (ver `.claude/rules/06-seguranca.md`).

## Auth (Dual-Mode)

**Web** — `(auth)/login/+page.server.ts` action → `authDependencies.authenticateUser.execute()` → emite cookie `ia_trainner_session` (`httpOnly`, `sameSite: lax`, base64 de `{ user, exp }`). `hooks.server.ts` decodifica em `event.locals.session`. Rotas `/training`, `/rag`, `/server`, `/models` exigem session.

**Tauri** — `authStore.login()` → `getAuthService()` (factory `isTauri()`) → `TauriAuthService.login()` → `invoke('login')` em Rust → token persiste em Tauri Store.

A interface `AuthService` é a mesma; o Web stub apenas lança erro porque o fluxo real passa por form actions.

## Padrões obrigatórios
Detalhado em `.claude/rules/`. Resumo:

- **Svelte 5 runes** (`$state`, `$props`, `$derived`). **PROIBIDO** `export let` legado.
- **SSR-first**: dados em `+page.server.ts` `load`, mutações em `actions`. Evitar API routes.
- **Zero token no client**: cookie `httpOnly` (Web) ou Tauri Store (Tauri).
- **Hexagonal no server**: `domain → application → infrastructure`. Casos de uso não conhecem HTTP/SQL.
- **Service Layer Dual-Mode**: `isTauri()` decide implementação. Interface única.
- **Design tokens**: tudo via `var(--*)` de `src/app.css`. Sem hex hardcoded.
- **Rotas**: kebab-case, grupos `(app)` e `(auth)`. SvelteKit resolve PathBase via `paths.base` se necessário (não usado hoje).
- **PT-BR no domínio**: campos, mensagens e UI com acentos.

## Backends conectados (status atual da v2)

| Domínio | Hexagonal modulo | Repository ativo | TODO |
|---------|------------------|------------------|------|
| Auth | `lib/server/auth` | `auth.mock.repository.ts` | Trocar por `auth.http.repository.ts` apontando ao Lambda |
| Dashboard | `lib/server/dashboard` | mock | HTTP repo |
| Models | `lib/server/models` | mock | HTTP repo (Ollama via TrainingService) |
| RAG | `lib/server/rag` | mock | HTTP repo (Ares.Rag.Api) |
| Server status | `lib/server/serverStatus` | mock | HTTP repo (TrainingService) |
| Teams | `lib/server/teams` | mock | HTTP repo (TrainingService) |

A v2 ainda usa repositórios **mock** em todos os módulos. A migração para `http.repository.ts` é pendência principal — substituir `XxxMockRepository` por `XxxHttpRepository` em `lib/server/<modulo>/index.ts` quando estabilizar.

## Slash commands disponíveis (em `.claude/commands/`)

| Command | Uso |
|---------|-----|
| `/project:fe-analyze-feature` | Análise pré-implementação |
| `/project:fe-implement-feature` | Implementação passo a passo (Hexagonal + Dual-Mode) |
| `/project:fe-create-component` | Criar componente Svelte (atom/molecule/organism) |
| `/project:fe-refactor-component` | Refatorar componente, store ou caso de uso |
| `/project:fe-add-tests` | Adicionar testes (Vitest + Testing Library) |
| `/project:fe-validate-tests` | Validar confiabilidade dos testes |
| `/project:code-review` | Code review completo |
| `/project:quality-gate` | Quality gate consolidado |
| `/project:review-documentacao-e-governanca` | Review de documentação e governança |
| `/project:review-performance` | Review de performance |
| `/project:review-seguranca` | Review de segurança |
| `/project:review-testes` | Review de testes |

## Documentação detalhada

- `docs/architecture/frontend/00-overview.md` … `10-onboarding-guide.md` — arquitetura completa
- `docs/adrs/ADR-0001` … `ADR-0006` — decisões arquiteturais
- `docs/analysis/frontend/01-07` — análise inicial do código v2
- `docs/review/*.md` — reports de reviews (segurança, performance, testes, etc.)

## Onde ler primeiro
1. **Este arquivo**
2. **`.claude/rules/`** (8 arquivos) — regras obrigatórias
3. **`docs/architecture/frontend/10-onboarding-guide.md`**
4. **`docs/architecture/frontend/02-architecture-map.md`**
