# 05 — Análise do Design System

**Última atualização:** 2026-04-27

> Para análise detalhada com inventário completo de tokens e candidatos a extração, ver `docs/analysis/frontend/03-design-system.md` e `docs/analysis/frontend/04-mapa-reaproveitamento.md`. Este documento traz a visão arquitetural.

## Pilares

1. **Tokens CSS centralizados** em `src/app.css`.
2. **Dark-first**, com tema light em `[data-theme="light"]`.
3. **Atomic Design** em `src/lib/design-system/{atoms,molecules,organisms,templates}/`.
4. **Snippets Svelte 5** (`{#snippet}` / `{@render}`) para composição.
5. **CSS scoped** por padrão (estilos em `<style>` dentro do `.svelte`).

## Token taxonomia

| Família | Sub-famílias |
|---------|--------------|
| Background | primary, secondary, tertiary, surface, surface-hover, surface-active, elevated, overlay |
| Border | primary, secondary, accent, focus |
| Text | primary, secondary, tertiary, muted, inverse |
| Brand | primary (com hover/active/bg/glow) |
| Semantic | success, warning, error, info (cada uma com `-bg`) |
| Gradient | primary, surface, glow, sidebar |
| Shadow | sm, md, lg, xl, glow, inset |
| Spacing | xs (4px) → 2xl (48px) |
| Radius | sm (6px) → full (9999px) |
| Transition | fast (150ms), base (250ms), slow (400ms) |
| Layout | sidebar-width, sidebar-collapsed, header-height, content-max-width |
| Typography | `--font-sans` (Inter), `--font-mono` (JetBrains Mono) |

> **Lacuna**: tokens de tamanho de fonte (`--font-size-*`) ausentes. Recomendação: adicionar `xs/sm/base/lg/xl/2xl/3xl`.

## Componentes existentes

```
design-system/
└── organisms/
    ├── Sidebar.svelte        (~5.5 KB) — Sidebar com navegação, colapso, theme toggle
    └── Notifications.svelte  (~1 KB) — Toasts com auto-dismiss
```

Não há atoms, molecules nem templates ainda. Pages usam markup próprio.

## Tema dinâmico

### Como funciona
- Atributo `data-theme` no `<html>` controla qual conjunto de variáveis está ativo.
- `$lib/stores/theme.ts` mantém o modo (`'light' | 'dark' | 'system'`) e atualiza o atributo.
- Tauri persiste o modo via `tauri-plugin-store`. Web atualmente não persiste (modo reverte ao default `dark` em refresh sem cookie de tema).

### Sugestão para Web
Adicionar cookie de tema (não httpOnly, lido no SSR para evitar flash) em pull request futuro.

## Tipografia

- Importada via Google Fonts (`Inter` + `JetBrains Mono`) no topo de `app.css`.
- **Risco**: dependência externa. Em ambientes offline (Tauri sem rede) cai para fallback `system-ui`.
- **Alternativa futura**: hospedar fontes localmente via `static/fonts/` e self-host com `@font-face` apontando para `/fonts/...`.

## Padrões observados nas pages

### O que está bom
- 100% dos estilos por `var(--*)`. Sem hex hardcoded.
- Inputs ligados a labels via `for`/`id`.
- Forms usam `<form method="POST">` + `use:enhance` (Web).

### O que precisa ser extraído
Padrões com 3+ ocorrências que ainda não viraram componentes:
- Botão primário, input com label, badge, spinner (atoms)
- Card, alert, empty-state, page-header, form-field (molecules)

> Ver `04-mapa-reaproveitamento.md` para o mapa completo.

## Acessibilidade

| Item | Estado |
|------|--------|
| `<label for>` em forms | ✅ |
| `aria-label` em ícones (Sidebar, theme toggle) | ⚠️ não auditado |
| `:focus-visible` nos componentes | ⚠️ token existe; uso direto não auditado |
| Contraste de cores | ⚠️ não testado formalmente |
| Navegação por teclado | ⚠️ não testado |
| Screen reader friendly | ⚠️ não testado |

> **Pendência**: rodar auditoria com `axe-core` ou Lighthouse antes do deploy público.

## Lib externa considerada

- **Tailwind CSS** — descartado (verbosidade nos templates, perda dos tokens semânticos).
- **shadcn-svelte / Skeleton** — descartado por enquanto. Reavaliar se DS interno crescer demais ou se virem necessidades como combobox/select com a11y séria.
- **Bits UI / Melt UI** (headless) — possível adoção futura para componentes complexos (Select, Combobox, DropdownMenu).
