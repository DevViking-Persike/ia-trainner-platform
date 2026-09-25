# 02 — Diagnóstico Arquitetural (v2)

**Data:** 2026-04-27
**Escopo:** Verificação da adesão da v2 aos padrões definidos (Hexagonal, Dual-Mode, runes Svelte 5).

## Padrão alvo (recap)

- **Hexagonal por módulo** em `src/lib/server/<modulo>/{domain,application,infrastructure}` + composition root em `index.ts`.
- **Dual-Mode**: lógica server (Web SSR) ↔ comandos Rust (Tauri SPA). Service Layer em `src/lib/services/<modulo>.service.ts` é o router via `isTauri()`.
- **Svelte 5 runes** (`$state`, `$props`, `$derived`) — sem `export let` legado.
- **Auth**: cookie httpOnly (Web) + Tauri Store (Tauri). Sem token em `localStorage`.

## Adesão observada

### Hexagonal — ✅ aplicado em 6/6 módulos
Cada módulo (`auth`, `dashboard`, `models`, `rag`, `serverStatus`, `teams`) tem as 3 pastas e composition root. Casos de uso recebem `repository` por construtor; `infrastructure/` implementa interfaces de `domain/`. Nenhum import direto de `application` dentro de `infrastructure` ou vice-versa.

> **Limitação:** todas as `infrastructure/<modulo>.mock.repository.ts` retornam dados hardcoded. Nenhuma `*.http.repository.ts` foi criada — a Hexagonal está corretamente preparada, mas ainda não conecta a backends reais.

### Dual-Mode — ✅ aplicado consistentemente
`src/lib/services/platform.ts` expõe `isTauri()` com guarda contra SSR (`typeof window === 'undefined' → false`). Cada service usa o factory `getXxxService()` que decide qual implementação criar.

> **Assimetria intencional**: em vários services Web, a implementação é stub (`throw new Error('Web auth uses form actions')`). Isso é correto — Web usa SSR/form actions, não a fachada de service. O contrato existe para tipagem e Tauri.

### Runes Svelte 5 — ✅ adotado
Componentes (`Sidebar.svelte`, `Notifications.svelte`, pages) usam `let { ... } = $props()` e `$state()`. Não foi encontrado `export let` em arquivos novos.

> **Observação:** stores em `src/lib/stores/` ainda usam o padrão `writable()` clássico (não migraram para runes-only). É aceitável — runes em stores ainda exige discussão de padrões na comunidade Svelte.

### Auth — ⚠️ implementado, mas com débito
Cookie `ia_trainner_session` no Web é **base64 de `{ user, exp }`**, não JWT real. `hooks.server.ts:13` faz `JSON.parse(atob(cookie))` em vez de validar assinatura. O comentário no código declara explicitamente o débito: "In a real app we might call authDependencies.repository.verifySession(cookie)".

Tauri Store armazena o usuário corretamente via `tauri-plugin-store`, e os comandos Rust usam `Mutex<Option<AuthUserInfo>>` em memória. Sessão é restaurada via `restore_session` no boot.

## Violações encontradas

Nenhuma violação estrutural significativa detectada na análise.

Pontos de atenção (não-violações, mas worth noting):

| Item | Local | Categoria |
|------|-------|-----------|
| `csp: null` no `tauri.conf.json:24` | Tauri | Segurança permissiva — esperado em fase MVP |
| `developmentTeam: L9ZD989PDG` hardcoded | `tauri.conf.json:39` | Identificador Apple commitado |
| `console.error` em `(app)/models/+page.svelte:14` | UI | Debug não-removido |
| Comentário "for now" em `(app)/profile/+page.svelte` | UI | Marca de débito reconhecido |
| `(app)/training/+page.svelte` sem `+page.server.ts` | Routes | Página exibe mock client-side; quando HTTP repos chegarem, vai precisar de SSR |

## Direção de dependências

Verificada manualmente:

```
+page.svelte
   ↓ (data prop)
+page.server.ts
   ↓ (import)
$lib/server/<modulo>/index.ts (composition root)
   ↓ (instancia)
$lib/server/<modulo>/application/<usecase>.ts
   ↓ (depende de interface)
$lib/server/<modulo>/domain/<modulo>.repository.ts
   ↑ (implementa)
$lib/server/<modulo>/infrastructure/<modulo>.{mock|http}.repository.ts
```

E em paralelo, no Tauri:

```
+page.svelte
   ↓
$lib/services/<modulo>.service.ts (factory isTauri())
   ↓
$lib/tauri.ts (wrapper invoke)
   ↓
src-tauri/src/commands.rs (#[tauri::command])
```

Nenhum vazamento detectado: client-side não importa `$lib/server/...`, e `infrastructure/` não importa `application/`.

## Cobertura por feature × estado

| Feature | Hexagonal Web | Comando Rust Tauri | Service Layer | UI | Backend real |
|---------|---------------|--------------------|--------------|----|----|
| Auth | ✅ mock | ✅ mock | ✅ Tauri impl | ✅ login, cadastro, logout, verificar-email | ❌ |
| Dashboard | ✅ mock | ✅ mock | ✅ | ✅ | ❌ |
| Models | ✅ mock | ✅ mock | ✅ | ✅ list + chat | ❌ |
| RAG | ✅ mock | ✅ mock | ✅ | ✅ collections + chat | ❌ |
| Server status | ✅ mock | ✅ mock | ✅ | ✅ | ❌ |
| Teams | ✅ mock | ✅ mock | ✅ | ✅ list + invite | ❌ |
| Training | (sem `+page.server.ts`) | ✅ mock | ✅ | ✅ client-side | ❌ |
| Profile | (sem) | (sem) | (n/a) | ✅ local-only | ❌ |

## Conclusão arquitetural

A v2 está **corretamente estruturada** segundo as regras do `.claude/rules/`. A maior dívida não é estrutural mas **funcional**: tudo é mock. Quando os HTTP repositories chegarem, será uma operação local (substituir referência em `index.ts` + criar arquivo `<modulo>.http.repository.ts`), sem refactor de UI ou casos de uso.

A consistência entre Web SSR e Tauri SPA está alta. Risco de drift existe e exigirá disciplina quando a feature surface crescer.
