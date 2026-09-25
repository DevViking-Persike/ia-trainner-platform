# Regras de Rotas e Navegação

**Objetivo:** Manter a estrutura de rotas SvelteKit consistente, segura e dual-mode (Web SSR + Tauri SPA).

## Estrutura

```
src/routes/
├── +layout.svelte                # raiz (sem deps de auth)
├── (auth)/                       # grupo público (sem Sidebar)
│   ├── login/
│   ├── cadastro/
│   ├── logout/
│   └── verificar-email/
└── (app)/                        # grupo autenticado (com Sidebar)
    ├── +layout.svelte            # AppLayout (Sidebar + page-container)
    ├── +page.svelte              # Dashboard ("/")
    ├── models/
    │   ├── +page.svelte
    │   └── chat/
    ├── profile/
    ├── rag/
    │   ├── +page.svelte
    │   └── chat/
    ├── server/
    ├── teams/
    └── training/
```

## Obrigatório

- Nomes de rotas em **kebab-case**: `meu-perfil`, `verificar-email`. Underscore e camelCase PROIBIDOS em segmentos de URL.
- Grupos `(app)` e `(auth)` separam zonas com layout/auth diferentes. Não misturar — página autenticada vai em `(app)`, pública em `(auth)`.
- Toda página do grupo `(app)` confia em `event.locals.session` ser não-nulo. O guard está em `hooks.server.ts` — NÃO duplicar verificação na página, exceto para autorização fina (ex: só admin).
- Adicionar nova rota protegida → atualizar `hooks.server.ts` para incluir o prefixo no guard.
- Carregar dados em `+page.server.ts` (`export const load`). PROIBIDO `+page.ts` para dados que dependem de auth ou backend privado — `+page.ts` roda no client em produção e expõe lógica.
- Mutações via `actions` em `+page.server.ts` + `<form method="POST">` no `.svelte` com `use:enhance` para UX. PROIBIDO criar `+server.ts` (API route) só para form submit.
- Navegação programática: `import { goto } from '$app/navigation'` + `goto('/training')`. SvelteKit já resolve `paths.base` quando configurado.
- Links: `<a href="/training">` e `<NavLink>` equivalente. SvelteKit resolve relativo ao `paths.base`.

## Permitido

- `+server.ts` (API routes) PODEM existir APENAS para webhooks externos, endpoints públicos JSON ou integrações de terceiros que precisam URL fixa. NÃO para form submit interno.
- `+layout.server.ts` PODE expor dados comuns ao grupo (ex: session info para Sidebar via `data.session`).
- `+page.ts` (sem `.server`) PODE ser usado para dados públicos que rodam no client (raro neste projeto).
- Usar `redirect(303, '/...')` em load/action para redirecionar. NUNCA `goto()` em código server.

## Proibido

- PROIBIDO criar páginas fora de `(app)` ou `(auth)` sem motivo arquitetural — quebra segregação de layout.
- PROIBIDO fazer fetch para o próprio domínio (ex: `fetch('/api/...')`) de dentro do mesmo SvelteKit. Se precisa de dados, é `load` ou `action` direto.
- PROIBIDO usar `window.location.href = ...` para navegação. Usar `goto()`.
- PROIBIDO usar paths absolutos com URL completa (`https://meu-dominio/...`) em `<a>` ou `goto()` — quebra Tauri (que serve SPA local).
- PROIBIDO depender de query params para passar estado entre rotas — usar form actions ou store.
- PROIBIDO assumir que `params` é seguro — sempre validar (`if (!params.id) throw error(400, ...)`).

## Sinais de alerta

- Rota autenticada sem prefixo no guard de `hooks.server.ts`.
- `+page.svelte` chamando `fetch` no `<script>` em vez de receber via `load`.
- Página dependendo de `localStorage` para hidratar dados — quebra SSR.
- Dois grupos `(app)` aninhados sem motivo claro.
- Rota com nome em camelCase ou snake_case.
