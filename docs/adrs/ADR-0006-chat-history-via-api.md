# ADR-0006 — Auth via Cookie httpOnly (Web) e Tauri Store (Desktop/Mobile)

## Status
Aceito · Implementado (com cookie base64; migração para JWT real pendente)

## Data
2026-04-27

## Contexto
A v2 precisa de auth seguro nos dois modos (Web SSR + Tauri SPA), com runtimes que tratam armazenamento de credenciais de forma diferente:

- **Web (SSR)**: browser não pode receber tokens diretamente sem expor a XSS. SvelteKit oferece cookies `httpOnly` + form actions como padrão seguro.
- **Tauri (SPA)**: roda dentro de um shell Rust com WebView. Não há cookie httpOnly no sentido tradicional, mas há acesso a armazenamento criptografado do OS via `tauri-plugin-store`.

No v1 (Blazor), todos os tokens viviam em `IAuthService` Singleton — o que causou bugs de vazamento entre circuits SignalR. Não repetir esse erro.

## Decisão

### Web
- Form action `(auth)/login/+page.server.ts` autentica via caso de uso → recebe `user` + `exp` → encoda em base64 e seta cookie:
  ```ts
  cookies.set('ia_trainner_session', btoa(JSON.stringify({ user, exp })), {
    path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24
  });
  ```
- `hooks.server.ts` lê o cookie em toda request, valida `exp`, popula `event.locals.session`.
- Rotas autenticadas (`/training`, `/rag`, `/server`, `/models`) são guardadas em `hooks.server.ts` antes de `resolve()`.

### Tauri
- `(auth)/login/+page.svelte` em modo Tauri detecta `isTauri()` → chama `authStore.login()` → `services.auth` (Tauri impl) → `lib/tauri.ts auth.login()` → `invoke('login', { email, senha })` em Rust.
- Rust em `src-tauri/src/commands.rs` faz HTTP no Lambda Keycloak e persiste tokens em Tauri Store (criptografia OS).
- `restore_session` é chamado no boot do app para restaurar o usuário autenticado.

### Migração pendente
O cookie atual carrega `{ user, exp }` em base64 — não é JWT real. Quando o `auth.http.repository.ts` for criado e apontar ao Lambda, o cookie passa a guardar o `access_token` JWT real e a validação em `hooks.server.ts` chama `authDependencies.repository.verifySession(token)`.

## Alternativas consideradas
- **Token em `localStorage`** — descartado: vulnerável a XSS, não acessível server-side.
- **Token em `sessionStorage` + Authorization header** — descartado: idem XSS, mais código para manter, sem benefício.
- **OAuth2 implicit flow no client** — descartado: fluxo deprecated, exige tokens no client.
- **JWT no client + refresh em background** — descartado: maior superfície de ataque que cookie httpOnly.

## Consequências
**Ganhos**
- Cookie httpOnly imune a XSS comum.
- `hooks.server.ts` centraliza auth — sem duplicação por página.
- Tauri Store usa cripto do OS (Keychain no macOS, DPAPI no Windows, etc.).
- Mesma interface no client (`getAuthService()`), implementação difere por runtime.

**Trade-offs**
- Cookie atual é base64 simples — não é JWT até a migração para HTTP repository.
- Tauri Store em iOS/Android é mais novo — testar persistência entre updates.
- Web precisa form actions em vez de `fetch('/api/login')` — exige page-server por rota auth.

## Impacto em código, testes e operação
- **Código**:
  - `hooks.server.ts` — auth guard SSR
  - `(auth)/login/+page.server.ts` — form action emitindo cookie
  - `src-tauri/src/commands.rs` — comandos Rust de auth
  - `src/lib/tauri.ts` — wrapper tipado de invoke
  - `src/lib/services/auth.service.ts` — factory Web/Tauri
- **Testes**: testar fluxo de login Web (Playwright) + comando Rust (cargo test).
- **Operação**: cookie precisa `secure: true` em produção (`process.env.NODE_ENV === 'production'`).
- **Migração JWT**: ver `.claude/rules/08-migracoes-pendentes.md` item 2.

## ADRs relacionados
- ADR-0001 — Adoção SvelteKit + Tauri
- ADR-0005 — Hexagonal SSR + SPA
