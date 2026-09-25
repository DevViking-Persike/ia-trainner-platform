# 00 — Visão Geral do Frontend (v2)

**Última atualização:** 2026-04-27

## Resumo executivo

Frontend único da plataforma IA Trainner, escrito em **SvelteKit 2 + Svelte 5 + Tauri 2**, em arquitetura **Dual-Mode**: o mesmo código atende Web (SSR Node) e Desktop/Mobile (Tauri SPA com shell Rust). Todo o código vive na raiz do submodule `Frontend` do repositório `ia-trainner-microservico`.

## Por que existe

- Plataforma acadêmica para treinamento de modelos de IA local (fine-tuning) e RAG sobre documentos.
- Atende cinco features principais: **Auth**, **Training**, **Models** (incluindo chat direto com Ollama), **RAG** (workspaces + upload + chat contextualizado), **Teams**.
- Acompanha um conjunto de microsserviços backend independentes (Lambda Keycloak para auth, TrainingService no K8s para jobs/equipes/server, Ares.Rag.Api para RAG).

## Stack consolidada

| Camada | Tecnologia |
|--------|-----------|
| UI | SvelteKit 2.x + Svelte 5 (runes) |
| Linguagem | TypeScript ~5.6 (strict) |
| Bundler | Vite 6 |
| Shell nativo | Tauri 2 (Rust + WebView) |
| Adapter Web | `@sveltejs/adapter-auto` (SSR Node) |
| Adapter Tauri | `@sveltejs/adapter-static` (SPA) |
| Tema | CSS custom properties (dark-first) em `src/app.css` |
| Auth Web | Cookie httpOnly + SvelteKit form actions |
| Auth Tauri | `@tauri-apps/plugin-store` (criptografia OS) |
| Backend | Microsserviços HTTP (Lambda + K8s) |

## Modelo Dual-Mode

```
                                  ┌────────────────────────────┐
                                  │  Backends (HTTP REST)      │
                                  │  - Lambda Keycloak (auth)  │
                                  │  - TrainingService (K8s)   │
                                  │  - Ares.Rag.Api (K8s)      │
                                  │  - Ollama (via Training)   │
                                  └────────────▲───────────────┘
                                               │
              Web (SSR)                       │                Tauri (SPA + Rust shell)
   ┌───────────────────────────┐               │      ┌────────────────────────────────┐
   │ Browser ─► Node SSR       │               │      │ WebView ─► Rust commands       │
   │ +page.svelte              │               │      │ +page.svelte                   │
   │ +page.server.ts (load,    │               │      │   └► getXxxService() (factory) │
   │   actions)                │ ──── HTTP ────┼────► │       └► lib/tauri.ts          │
   │   └► UseCase.execute()    │               │      │           └► invoke('cmd')     │
   │       └► HTTP repository  │               │      │               └► commands.rs   │
   │ Auth: cookie httpOnly     │               │      │ Auth: tauri-plugin-store       │
   └───────────────────────────┘               │      └────────────────────────────────┘
                                               │
                                  Mesmo código UI (.svelte)
                                  Mesmo design system (app.css)
                                  Mesmos tipos (lib/types.ts)
```

## Convenções centrais

- **Hexagonal por módulo** em `src/lib/server/<modulo>/{domain,application,infrastructure}` — para o lado SSR.
- **Service Layer Dual-Mode** em `src/lib/services/<modulo>.service.ts` com factory `getXxxService()` decidindo via `isTauri()`.
- **Wrapper único** de IPC em `src/lib/tauri.ts` — nunca chamar `invoke()` direto do componente.
- **PT-BR no domínio** (campos, validações, mensagens) com acentos preservados.
- **Snippets Svelte 5** (`{#snippet}` / `{@render}`) — sem `<slot />` legado.

## O que está pronto vs pendente

| Capacidade | Estado |
|------------|--------|
| UI completa de todas as features | ✅ |
| Hexagonal estruturado em 6 módulos | ✅ |
| Comandos Rust para todas as 7 áreas (auth, training, models, rag, teams, theme, server) | ✅ (mocks) |
| Auth Dual-Mode | ✅ (cookie base64; JWT real pendente) |
| Tema dinâmico dark/light | ✅ |
| Repositories HTTP reais | ❌ todos mock |
| Stack de testes | ❌ não instalada |
| CI/CD | ❌ não configurado |
| Atoms/molecules/templates do DS | ❌ apenas organisms |
| Deploy público SSR | ❌ pendente |

## Documentos relacionados (este diretório)

- `01-business-context.md` — domínio, atores, stakeholders, restrições
- `02-architecture-map.md` — mapa de dependências entre camadas
- `03-folder-structure.md` — estrutura completa de diretórios
- `04-runtime-flow.md` — fluxos de runtime (login, query RAG, chat com modelo)
- `05-design-system-analysis.md` — tokens, componentes, tema
- `06-component-reuse-map.md` — duplicação detectada e candidatos
- `07-testing-analysis.md` — estado dos testes
- `08-risks-and-tech-debt.md` — riscos identificados
- `09-recommended-evolution.md` — roadmap arquitetural
- `10-onboarding-guide.md` — guia para devs novos
