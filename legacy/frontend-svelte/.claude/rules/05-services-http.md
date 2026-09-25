# Regras do Service Layer e HTTP

**Objetivo:** Garantir que toda comunicação com backend passe pela camada correta, sem vazamento entre Web (SSR) e Tauri (IPC).

## Princípio Dual-Mode

A app roda em dois modos com **runtimes fundamentalmente diferentes**:

| Modo | Runtime | Como acessa backend | Tokens vivem em |
|------|---------|---------------------|-----------------|
| **Web** | Node SSR + browser | `+page.server.ts` chama caso de uso → `infrastructure/<modulo>.http.repository.ts` (fetch server-side) | Cookie `httpOnly` (server) |
| **Tauri** | Rust shell + WebView | `lib/tauri.ts` `invoke('comando', ...)` → `src-tauri/src/commands.rs` (Rust faz HTTP) | `tauri-plugin-store` |

A camada `src/lib/services/` é o **router** que decide qual implementação usar via `isTauri()`. Existe interface única; implementações são separadas.

## Onde mora cada coisa

```
src/lib/services/<modulo>.service.ts
  ├── interface XxxService { ... }                 ← contrato único
  ├── class XxxWebService implements XxxService    ← stub ou apoio (form actions fazem o real)
  ├── class XxxTauriService implements XxxService  ← chama lib/tauri.ts
  └── getXxxService()  ← factory: isTauri() ? Tauri : Web

src/lib/server/<modulo>/                           ← apenas Web (SSR)
  ├── domain/<modulo>.repository.ts                ← interface
  ├── application/<usecase>.ts                     ← caso de uso
  └── infrastructure/<modulo>.http.repository.ts   ← fetch real
  └── index.ts                                     ← composition root

src-tauri/src/commands.rs                          ← apenas Tauri
  └── #[tauri::command] async fn login(...) -> Result<...>
```

## Obrigatório

- Toda nova feature DEVE ter implementação **nos dois modos** (Web SSR + Tauri Rust). Se Tauri ainda não tem comando, criar stub que retorna erro claro tipo `"Not implemented in Tauri yet"`.
- Toda chamada HTTP do servidor DEVE ir por `infrastructure/<modulo>.http.repository.ts`. **NUNCA** `fetch` direto em `+page.server.ts` ou em caso de uso.
- Toda chamada IPC Tauri DEVE ir por `src/lib/tauri.ts` (wrapper tipado). **NUNCA** `invoke()` espalhado nos componentes.
- URLs de backend DEVEM vir de `$env/dynamic/private` (`AUTH_BASE_URL`, `TRAINING_BASE_URL`, `RAG_BASE_URL`, etc.).
- Em Tauri: URLs idem, mas via env Rust (`std::env::var(...)`) injetada em build.
- Erros de domínio devem ser **tipados** (lançar `class DomainError extends Error` específica) e tratados em `+page.server.ts` → `fail(400, ...)`.
- Operações que buscam listas DEVEM evitar N+1. Se backend não tem batch, paralelizar com `Promise.all()` ou cachear no repository.

## Permitido

- Records de resposta da API PODEM ser `private` no repository, mapeados para domain types antes de retornar.
- `JsonSerializerOptions`-equivalente (camelCase, snake_case) por backend é OK — cada repository converte.
- Cache em memória no repository PODE ser usado para dados que mudam raramente (lista de modelos Ollama). Invalidar em mutações.

## Proibido

- PROIBIDO importar `$lib/server/*` em `$lib/services/*` (cliente).
- PROIBIDO `fetch` em código client-side. Tudo via form actions (Web) ou `lib/tauri.ts` (Tauri).
- PROIBIDO hardcodar URL de backend em qualquer arquivo. Sempre env var.
- PROIBIDO criar base class compartilhada entre `WebXxxService` e `TauriXxxService`. Duplicação aqui é intencional (runtimes diferentes).
- PROIBIDO usar `localStorage` para tokens — em Web é cookie httpOnly; em Tauri é Tauri Store. Ver `06-seguranca.md`.
- PROIBIDO chamadas HTTP sequenciais quando podem ser paralelas (`Promise.all`).

## Sinais de alerta

- Service com método que só funciona no modo Web ou só no Tauri — quebra Dual-Mode.
- `fetch(...)` em `.svelte`, `lib/services/*` ou `lib/stores/*`.
- URL de backend em string literal no código.
- `XxxService` sem factory `getXxxService()` — provável uso direto da implementação.
- Repository chamando 3+ endpoints sequenciais — paralelizar.
