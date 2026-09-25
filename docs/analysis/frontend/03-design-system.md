# 03 — Análise do Design System (v2)

**Data:** 2026-04-27
**Escopo:** Tokens CSS, componentes Svelte, tema, e acessibilidade básica.

## Fonte da verdade

`src/app.css` — ~800 linhas, dark-first, com tema light em `[data-theme="light"]`.

## Tokens — categorização

| Categoria | Quantidade | Notas |
|-----------|-----------|-------|
| Backgrounds (`--bg-*`) | 8 | primary, secondary, tertiary, surface, surface-hover, surface-active, elevated, overlay |
| Bordas (`--border-*`) | 4 | primary, secondary, accent, focus |
| Texto (`--text-*`) | 5 | primary, secondary, tertiary, muted, inverse |
| Brand / Accent (`--color-primary*`) | 5 | primary, hover, active, bg, glow |
| Semânticas | 8 | success, warning, error, info — cada uma com `-bg` |
| Gradientes | 4 | primary, surface, glow, sidebar |
| Sombras | 6 | sm, md, lg, xl, glow, inset |
| Tipografia | 2 famílias | `Inter` (300-800), `JetBrains Mono` (400-600) — Google Fonts |
| Espaçamento | 7 | xs (4px) → 2xl (48px) |
| Radius | 5 | sm (6px) → full (9999px) |
| Transitions | 3 | fast (150ms), base (250ms), slow (400ms) |
| Layout | 4 | sidebar-width (260px), sidebar-collapsed (72px), header-height (64px), content-max-width (1400px) |

> Total estimado: **~60 tokens** únicos. Cobertura suficiente para o produto atual sem inflação.

## Suporte a tema

- **Dark-first**: `:root` e `[data-theme="dark"]` definem os mesmos valores.
- **Light**: `[data-theme="light"]` redefine todos os tokens — não foi auditada paridade campo-a-campo, mas a estrutura está correta.
- **Switching**: `$lib/stores/theme.ts` chama `tauri.theme.set(mode)` (Tauri) e atualiza `document.documentElement.setAttribute('data-theme', mode)` em ambos os modos.
- **Persistência**: Tauri Store em Tauri; localStorage não é usado (cookie/server seria necessário pra Web).

## Tipografia

- Importada via Google Fonts no topo de `app.css`.
- Variáveis: `--font-sans` (Inter) e `--font-mono` (JetBrains Mono).
- Não há definição de escalas tipográficas (`--font-size-*`) — sizes ficam inline nos componentes.

> **Recomendação:** adicionar tokens `--font-size-xs/sm/base/lg/xl/2xl/3xl` para padronizar e evitar magia visual.

## Componentes existentes

Pasta: `src/lib/design-system/`

| Nível | Conteúdo |
|-------|----------|
| atoms | (vazio) |
| molecules | (vazio) |
| organisms | `Sidebar.svelte`, `Notifications.svelte` |
| templates | (vazio) |

### `Sidebar.svelte`
- ~5.5 KB
- Estado interno: `$state` para colapso
- Consome stores diretamente: `authStore`, `themeStore`
- Lista de rotas hardcoded; navegação via `<a href="...">`
- Theme toggle visível

### `Notifications.svelte`
- ~1 KB
- Renderiza array de `notifications` (do store), com auto-dismiss
- Variantes por `type` (success / warning / error / info), com cores derivadas dos tokens

## Padrões observados nas pages

### Bom
- Uso consistente de `var(--*)` em estilos scoped.
- Páginas usam `<form method="POST">` com `use:enhance` para form actions (Web).
- Inputs ligados a `<label for="...">`.

### Atenção
- Inline `style="..."` aparecem em poucos lugares (auditados como dinâmicos), não foi observado abuso.
- Nenhum padrão repetido (botões, cards, alerts) foi extraído como componente — pages têm seu próprio markup.

## Acessibilidade básica

| Item | Status | Observação |
|------|--------|------------|
| `<label for>` em formulários | ✅ presente em login/cadastro |
| `aria-label` em ícones / botões icon-only | ⚠️ não auditado em Sidebar / theme toggle |
| `:focus-visible` em interativos | ⚠️ tokens existem (`--border-focus`), uso direto não auditado |
| Contraste de cores | ⚠️ não testado formalmente; paleta dark é tipicamente confortável |
| HTML semântico (`<nav>`, `<main>`) | ✅ presente em layouts |

## Lacunas identificadas

1. **Atoms ausentes**: `Button`, `Input`, `Badge`, `Avatar`, `Spinner` deveriam ser componentes — hoje cada page repete estilos.
2. **Molecules ausentes**: `Card`, `Alert`, `EmptyState`, `PageHeader`, `FormField` — padrões repetidos nas pages.
3. **Templates ausentes**: `AppLayout` (sidebar + content) e `AuthLayout` (centralizado) hoje vivem em `+layout.svelte` direto.
4. **Sem tokens tipográficos** (font sizes, line heights consistentes).
5. **Auditoria de a11y** pendente — exigirá uso de axe ou Lighthouse.

## Recomendações

- **Curto prazo (1-2 semanas)**: extrair `Button`, `Input`, `Card`, `EmptyState`, `Spinner` como primeiros componentes (têm 3+ usos visíveis).
- **Médio prazo**: definir escala tipográfica (`--font-size-*`) e migrar font-sizes hardcoded.
- **Longo prazo**: rodar auditoria a11y completa antes de promover v2 a deploy público.
