# 02 — Mapa Arquitetural

**Última atualização:** 2026-04-27

## Camadas e dependências

```
┌──────────────────────────────────────────────────────────────────┐
│                          UI (Svelte)                             │
│  src/routes/{(auth),(app)}/**.svelte                             │
│  src/lib/design-system/{atoms,molecules,organisms,templates}     │
│  src/lib/stores/                                                 │
└────────────────────────┬─────────────────────────────────────────┘
                         │
        ┌────────────────┴─────────────────┐
        │ Web (SSR)                         │ Tauri (SPA + Rust)
        ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────────────┐
│ +page.server.ts      │        │ src/lib/services/<modulo>.    │
│ (load + actions)     │        │   service.ts (factory         │
│ hooks.server.ts      │        │   isTauri())                  │
└──────────┬───────────┘        └──────────────┬───────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────────────┐
│ src/lib/server/       │        │ src/lib/tauri.ts             │
│   <modulo>/index.ts   │        │  (wrapper invoke tipado)     │
│ (composition root)    │        └──────────────┬───────────────┘
└──────────┬────────────┘                       │
           │                                    ▼
           ▼                        ┌──────────────────────────┐
┌──────────────────────┐            │ src-tauri/src/commands.rs │
│ application/<usecase> │            │ (#[tauri::command])      │
└──────────┬────────────┘            └──────────────┬───────────┘
           │                                        │
           ▼                                        ▼
┌──────────────────────┐                ┌──────────────────────┐
│ domain/<modulo>.     │                │ Rust HTTP / Store /   │
│   repository (interface)              │   reqwest             │
└──────────┬────────────┘                └──────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ infrastructure/<modulo>.      │
│   {mock|http}.repository.ts   │
└──────────┬────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ Backends HTTP                                                     │
│  Lambda Keycloak | TrainingService K8s | Ares.Rag.Api | Ollama   │
└──────────────────────────────────────────────────────────────────┘
```

## Regras de import (enforced manualmente — futuro: ESLint custom)

| De | Pode importar | Não pode |
|----|--------------|----------|
| `routes/**.svelte` | `$lib/services/*`, `$lib/stores/*`, `$lib/design-system/*`, `$lib/types` | `$lib/server/*`, `$lib/tauri` (use serviço) |
| `+page.server.ts` | `$lib/server/<modulo>` (apenas), `@sveltejs/kit` | `$lib/services/*`, `$lib/tauri` |
| `lib/services/*` | `$lib/tauri`, `$lib/types`, `$lib/services/platform` | `$lib/server/*` |
| `lib/server/<m>/application/*` | `lib/server/<m>/domain/*` | `lib/server/<m>/infrastructure/*` |
| `lib/server/<m>/infrastructure/*` | `lib/server/<m>/domain/*`, `$env/dynamic/private` | `lib/server/<m>/application/*` |
| `lib/server/<m>/domain/*` | (nada) | tudo |
| `lib/tauri.ts` | `@tauri-apps/api`, `$lib/types` | `$lib/server/*` |
| `src-tauri/src/*` | `tauri`, `tauri-plugin-*`, `reqwest`, `serde` | (nada do TS) |

> SvelteKit já bloqueia tecnicamente imports de `$lib/server/*` em código que vai pro client. As outras regras são por convenção.

## Composition root por módulo

Exemplo (`src/lib/server/auth/index.ts`):

```typescript
const authRepository = new AuthMockRepository();   // <- TROCAR para AuthHttpRepository

export const authDependencies = {
  authenticateUser: new AuthenticateUserUseCase(authRepository),
  registerUser:     new RegisterUserUseCase(authRepository),
  repository:       authRepository,                // exposto p/ verifySession futuro
};
```

Padrão idêntico nos 6 módulos. Substituir mock por HTTP é um one-liner.

## Estados globais

| Onde | O que mantém | Padrão |
|------|--------------|--------|
| `event.locals.session` | Usuário autenticado por request (Web) | SvelteKit locals + cookie |
| `lib/stores/auth.ts` | Estado client-side de auth (`{ user, isAuthenticated, loading }`) | `writable()` |
| `lib/stores/theme.ts` | Modo de tema corrente | `writable()` + sincronia Tauri Store |
| `lib/stores/notifications.ts` | Toasts ativos | `writable()` com auto-dismiss |
| `Mutex<Option<AuthUserInfo>>` (Rust) | Usuário autenticado em Tauri | `lazy_static` + `Mutex` |
| `tauri-plugin-store` JSON | Sessão persistente (Tauri) | Plugin oficial |

## Pontos de extensão

Para adicionar novo módulo (exemplo: `notifications-history`):

1. Criar `src/lib/server/notificationsHistory/` com `domain/`, `application/`, `infrastructure/`, `index.ts`.
2. Adicionar tipos em `src/lib/types.ts`.
3. Criar `src/lib/services/notifications-history.service.ts` com factory.
4. Adicionar comandos Rust em `src-tauri/src/commands.rs` + entrada em `lib/tauri.ts`.
5. Criar página em `src/routes/(app)/notifications/+page.{svelte,server.ts}`.
6. Adicionar ao guard de `hooks.server.ts` se for autenticada.

## Backends — endpoints consumidos

Apenas via `infrastructure/*.http.repository.ts` ou Rust:

| Backend | URL base (env) | Recursos |
|---------|----------------|----------|
| Lambda Keycloak | `AUTH_BASE_URL` | login, register, verify-email, refresh, me, account |
| TrainingService | `TRAINING_BASE_URL` | jobs, models, teams, server status, chat |
| Ares.Rag.Api | `RAG_BASE_URL` | workspaces, documents, query, search |

URLs nunca expostas ao client. Sempre `$env/dynamic/private`.
