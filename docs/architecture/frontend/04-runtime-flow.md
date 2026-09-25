# 04 — Fluxo de Execução (Runtime)

**Última atualização:** 2026-04-27

Sequências dos fluxos críticos nos dois modos.

## 1. Login — Web (SSR)

```
User submits <form method="POST"> em (auth)/login/+page.svelte
        │
        ▼
SvelteKit roteia para (auth)/login/+page.server.ts → action default
        │
        ▼
authDependencies.authenticateUser.execute(email, senha)
        │
        ▼
AuthMockRepository (futuro: AuthHttpRepository → POST /api/auth/login no Lambda)
        │
        ▼ retorna AuthUserInfo
cookies.set('ia_trainner_session', btoa(JSON.stringify({ user, exp })),
            { httpOnly: true, sameSite: 'lax', maxAge: 86400 })
        │
        ▼
throw redirect(303, '/')
        │
        ▼
Browser segue redirect para '/' (dashboard)
        │
        ▼
hooks.server.ts handle:
  cookie = event.cookies.get('ia_trainner_session')
  payload = JSON.parse(atob(cookie))
  if payload.exp > Date.now() → event.locals.session = payload.user
        │
        ▼
(app)/+page.server.ts load:
  if (!locals.session) redirect /login
  return await dashboardDependencies.getOverview.execute()
        │
        ▼
(app)/+page.svelte renderiza com data
```

## 2. Login — Tauri

```
User submits <form> em (auth)/login/+page.svelte
isTauri() === true → handleTauriLogin()
        │
        ▼
authStore.login(email, senha)
        │
        ▼
getAuthService() → new TauriAuthService()
        │
        ▼
TauriAuthService.login() →
  (await import('$lib/tauri')).auth.login(email, senha)
        │
        ▼
invoke('login', { email, senha })
        │
        ▼ Rust
src-tauri/src/commands.rs login()
  - valida credenciais (mock: teste@exemplo.com / Senha123!@#123)
  - cria AuthUserInfo
  - tauri-plugin-store: salva sessão JSON
  - state: Mutex<Option<AuthUserInfo>> = Some(user)
  - retorna AuthUserInfo
        │
        ▼ TS
authStore atualiza { user, isAuthenticated: true }
        │
        ▼
goto('/') → carrega dashboard via SPA routing
```

## 3. Carregar dashboard — Web

```
GET /
        │
        ▼
hooks.server.ts → valida cookie → locals.session populado
        │
        ▼
(app)/+page.server.ts load:
  return await dashboardDependencies.getOverview.execute()
        │
        ▼
GetDashboardOverview.execute() chama dashboardRepository.getOverview()
        │
        ▼
DashboardMockRepository retorna { jobs, colecoes, gpuHours, creditos }
        │
        ▼
(app)/+page.svelte recebe via $props().data e renderiza cards
```

## 4. Criar coleção RAG — Web

```
User clica "+ Nova coleção" em (app)/rag/+page.svelte
abre formulário (modal ou inline)
submit <form method="POST" action="?/create" use:enhance>
        │
        ▼
(app)/rag/+page.server.ts actions.create
  data = await request.formData()
  await ragDependencies.createCollection.execute({ nome, descricao })
        │
        ▼ catch erro
  return fail(400, { error: e.message })
        │
        ▼ sucesso
  return { success: true }
        │
        ▼
use:enhance recarrega load() automaticamente, mostrando nova coleção
```

## 5. Query RAG — fluxo combinado (futuro com HTTP repo)

```
User digita pergunta em (app)/rag/chat/+page.svelte
clica enviar
        │
        ▼
[Web]                              [Tauri]
ragService.query(...)              ragService.query(...)
  via factory                        via factory
  → WebRagService                    → TauriRagService
  (form action ou +server.ts)        → invoke('query_rag', ...)
        │                              │
        ▼                              ▼
ragDependencies.query.execute()    Rust:
  → RagHttpRepository                reqwest::post("...:8001/query")
    fetch(`${RAG_BASE_URL}/query`)
  → Ares.Rag.Api                     Ares.Rag.Api
    Qdrant similarity                Qdrant similarity
    Ollama smart                     Ollama smart
  retorna resposta                  retorna resposta
        │                              │
        ▼                              ▼
UI renderiza streaming (futuro: SSE)
```

## 6. Tema toggle

```
User clica botão de tema em Sidebar
        │
        ▼
themeStore.toggle()
  current = $themeStore = 'dark' | 'light'
  next = current === 'dark' ? 'light' : 'dark'
        │
        ▼
[Tauri]                           [Web]
invoke('set_theme', next)         localStorage não usado;
                                  apenas atributo no DOM (perde em refresh)
        │                          │
        ▼                          ▼
tauri-plugin-store: persiste     document.documentElement
                                   .setAttribute('data-theme', next)
        │
        ▼
themeStore atualizado
CSS variables em [data-theme="..."] aplicam novos valores
```

## 7. Logout

```
User clica "Sair" em Sidebar (organisms/Sidebar.svelte)
        │
        ▼
[Web]                              [Tauri]
<a href="/logout">                  authStore.logout() →
                                    TauriAuthService.logout() →
                                    invoke('logout')
        │                              │
        ▼                              ▼
(auth)/logout/+page.server.ts      Rust:
  cookies.delete('ia_trainner_       state.user.lock() = None
    session')                        store.delete('user')
  redirect(303, '/login')          retorna
                                       │
                                       ▼
                                    goto('/login')
```

## 8. Boot do app Tauri

```
Tauri inicia (window 1400x900)
WebView carrega index.html (build/)
SvelteKit hidrata
        │
        ▼
+layout.svelte onMount:
  if (isTauri()) themeStore.init()  → invoke('get_theme') → aplica
  authStore.restoreSession()         → invoke('restore_session')
        │
        ▼
Rust restore_session:
  store.get('user') → Some(AuthUserInfo) ?
    state.user = Some(user); return true
    : return false
        │
        ▼
Se restored: authStore atualiza, app fica autenticado.
Se não: usuário vê login.
```

## Notas de performance

- **SSR do dashboard** em prod com mock repos: ~50-100ms (mock instantâneo). Com HTTP repo real, depende do backend (estimativa 100-300ms).
- **Tauri invoke**: ~1-5ms (overhead IPC trivial).
- **SvelteKit hydration**: depende do tamanho do bundle — Svelte 5 produz bundles muito pequenos (sub-100kb gzipped esperado).
- **Tema toggle**: instantâneo (apenas re-aplica CSS variables).
