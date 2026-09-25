# IA Trainner — Frontend

Plataforma para acadêmicos treinarem modelos de IA local e criarem RAG (Retrieval-Augmented Generation) para estudar e analisar pesquisas.

Frontend único em **SvelteKit 2 + Svelte 5 + Tauri 2** com arquitetura **Dual-Mode**: Web (SSR Node) e Desktop/Mobile (Tauri SPA) compartilham o mesmo código.

## Stack

| Tecnologia | Uso |
|-----------|-----|
| SvelteKit 2 + Svelte 5 (runes) | Framework e UI |
| TypeScript ~5.6 | Tipagem |
| Vite 6 | Bundler |
| Tauri 2 (Rust) | Shell nativo (Windows / macOS / Linux / iOS / Android) |
| `@sveltejs/adapter-auto` | Build Web (SSR Node) |
| `@sveltejs/adapter-static` | Build Tauri (SPA) |
| Cookies httpOnly | Auth Web |
| Tauri Store | Auth Desktop / Mobile |
| Keycloak (via Lambda) | Autenticação real |

## Pré-requisitos

- **Node.js** 20+ e **npm**
- Para Tauri: **Rust** (rustup), **Xcode** (iOS), **Android SDK** (Android)
- A partir do macOS, ver `https://tauri.app/start/prerequisites/` para detalhes por OS

## Como rodar

Todo o código vive na raiz do `Frontend/`.

```bash
cd Frontend
npm install
```

### Web (SSR)
```bash
npm run dev          # http://localhost:1420
npm run build
npm run preview
```

### Desktop (Tauri)
```bash
npm run tauri:dev
npm run tauri:build  # gera .dmg / .msi / .AppImage
```

### Mobile
```bash
# iOS (precisa Xcode)
npm run tauri:ios:init
npm run tauri:ios:dev
npm run tauri:ios:build

# Android (precisa Android Studio + SDK)
npm run tauri:android:init
npm run tauri:android:dev
npm run tauri:android:build
```

### Type-check
```bash
npm run check
```

### Scripts de orquestração
Scripts wrapper de mais alto nível (start-all, deploy, build cross-platform) em `scripts/` — ver `scripts/README.md`.

## Estrutura do projeto

```
Frontend/
├── CLAUDE.md                 # Contexto para Claude Code
├── README.md                 # Este arquivo
├── .claude/rules/            # Regras de código (8 arquivos)
├── docs/                     # Arquitetura, ADRs, análises, reviews
├── scripts/                  # Orquestração (start, build, deploy, tests)
├── package.json
├── svelte.config.js          # Adapter dinâmico (auto vs static)
├── vite.config.js
├── tsconfig.json
├── static/                   # Assets estáticos
├── src/
│   ├── app.css               # Design tokens (dark-first)
│   ├── app.html              # Shell HTML do SvelteKit
│   ├── app.d.ts
│   ├── hooks.server.ts       # Auth guard SSR
│   ├── routes/               # Páginas — grupos (app) e (auth)
│   └── lib/
│       ├── server/<modulo>/  # Hexagonal (domain/application/infrastructure)
│       ├── services/         # Service Layer Dual-Mode (isTauri router)
│       ├── stores/           # Stores Svelte
│       ├── design-system/    # Atomic design (atoms / molecules / organisms / templates)
│       ├── tauri.ts          # Wrapper tipado de invoke()
│       └── types.ts
└── src-tauri/                # Rust (commands.rs, lib.rs, tauri.conf.json)
```

## Funcionalidades

- **Dashboard** — visão geral com stats, status do servidor, jobs recentes
- **Treinamento** — CRUD de jobs de fine-tuning (épocas, LR, batch)
- **Modelos** — catálogo Ollama + chat direto
- **RAG** — workspaces, upload de documentos, query contextualizada
- **Equipes** — criar, convidar por email, visibilidade compartilhada
- **Auth** — login, registro, verificação de email, refresh

## Backends

Frontend se comunica via HTTP com microsserviços (repositório separado):

- **KeycloakService** (AWS Lambda) — autenticação
- **TrainingService** (K8s Ganesha) — jobs, equipes, server status, chat
- **Ares.Rag.Api** (K8s Ganesha) — RAG workspaces, upload, query

URLs em `$env/dynamic/private` (`AUTH_BASE_URL`, `TRAINING_BASE_URL`, `RAG_BASE_URL`). **Nunca** expostas ao client.

Repo do backend: [ia-trainner-microservico](https://github.com/DevViking-Persike/ia-trainner-microservico).

## Documentação

- `CLAUDE.md` — contexto para Claude Code (deploy, backends, convenções)
- `docs/architecture/frontend/` — arquitetura completa
- `docs/adrs/` — Architecture Decision Records
- `docs/analysis/frontend/` — análise e plano de melhorias
- `docs/review/` — reports de reviews
- `scripts/README.md` — documentação dos scripts

## URL pública

A v2 ainda não foi promovida ao deploy público (`https://victorpersike.dev.br/ia-trainner/` aponta atualmente à versão antiga; substituição planejada).
