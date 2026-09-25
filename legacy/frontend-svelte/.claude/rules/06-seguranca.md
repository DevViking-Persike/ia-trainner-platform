# Regras de Segurança

**Objetivo:** Proteger credenciais, isolar sessão por modo (Web/Tauri), seguir boas práticas de auth.

## Auth por modo

| Modo | Onde token vive | Como página sabe quem está logado |
|------|-----------------|-----------------------------------|
| **Web** | Cookie `ia_trainner_session` (`httpOnly`, `sameSite: lax`, base64 de `{ user, exp }`) | `hooks.server.ts` decodifica em `event.locals.session` |
| **Tauri** | `@tauri-apps/plugin-store` (criptografado pelo OS) | Comando Rust `get_current_user` exposto via `lib/tauri.ts` |

> O cookie atual carrega `{ user, exp }` em base64 e é setado pelos form actions (`(auth)/login`, `(auth)/cadastro`). **Migração planejada**: substituir por JWT real do Keycloak quando o Lambda virar o repositório real (atualmente mock).

## Obrigatório

- Tokens / refresh tokens / API keys NUNCA no client. Em Web: cookie `httpOnly`. Em Tauri: Tauri Store.
- Variáveis sensíveis DEVEM vir de `$env/dynamic/private` (Web) ou env vars do processo Rust (Tauri). NUNCA `$env/static/public` ou `$env/dynamic/public` para secrets.
- `+page.server.ts` `load`/`action` é o ÚNICO lugar onde lógica autenticada server-side roda. Validar `locals.session` no início de cada `load` que precisa de auth.
- Rotas autenticadas DEVEM ser guardadas em `hooks.server.ts` (atualmente: `/training`, `/rag`, `/server`, `/models`). Adicionar prefixo novo ao guard quando criar rota protegida.
- Cookie de sessão DEVE ter: `httpOnly: true`, `sameSite: 'lax'` (ou `'strict'` se OAuth não exigir), `secure: true` em produção (`process.env.NODE_ENV === 'production'`).
- Frontend NUNCA acessa banco direto. PostgreSQL, MongoDB, Qdrant ficam em Ganesha/Oracle — frontend só chega via HTTP no microsserviço correspondente.

## Permitido

- `appsettings`/env files de dev PODEM existir (`.env.local`) com URLs de backend de dev — JÁ ignorados em `.gitignore`.
- Decodificar JWT no client APENAS para extrair claims não-sensíveis (`sub`, `name`, `exp`) e exibir UI. Validação real é server-side.
- Usar `@tauri-apps/plugin-store` para preferências do usuário (tema, idioma) além do token de auth.

## Proibido

- PROIBIDO commitar `.env`, `.env.local` com credenciais.
- PROIBIDO armazenar token em `localStorage`, `sessionStorage` ou estado global do client (`$lib/stores/*`).
- PROIBIDO logar token (mesmo em `console.log`) — nem em dev. Logar apenas IDs de sessão / sub claim.
- PROIBIDO desabilitar verificação de certificado HTTPS em produção (em Rust ou Node).
- PROIBIDO conectar o frontend direto em banco. Tudo via HTTP API dos microsserviços.
- PROIBIDO usar `$env/dynamic/public` para qualquer URL de backend que tenha rota não-pública.
- PROIBIDO confiar em validação client-side. SEMPRE revalidar no server (`+page.server.ts` action).

## Sinais de alerta

- `localStorage.setItem('token', ...)` ou similar.
- Token aparecendo em network tab fora de header `Authorization`.
- Cookie sem `httpOnly` em `cookies.set(...)`.
- Variável `$env/dynamic/public` com nome que sugere secret (`API_KEY`, `SECRET`, `TOKEN`).
- Página autenticada que não verifica `locals.session` no `load`.
- Acesso a `process.env` direto fora de `$env/dynamic/private` em código TypeScript do server.
