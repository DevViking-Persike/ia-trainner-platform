# ADR-0002 — Governança do Design System Svelte com tokens CSS dark-first

## Status
Aceito · Implementado

## Data
2026-04-27

## Contexto
A v2 precisa de um design system consistente entre Web SSR e Tauri (desktop/mobile) para que mesmas páginas e componentes funcionem identicamente nos dois modos. O time tem um único dev frontend, então abstrações precisam ser leves e auto-explicativas.

Lições do v1 (Blazor): tokens CSS em `:root` foram a parte mais bem-sucedida da governança visual; já o uso de inline `style="color: #..."` proliferou e teve que ser migrado depois.

## Decisão
- Tokens CSS centralizados em `src/app.css` (~800 linhas), **dark-first**.
- Tema controlado via atributo `data-theme="dark"|"light"` no `<html>`, gerenciado por `$lib/stores/theme.ts`.
- Componentes seguem **Atomic Design** em `src/lib/design-system/{atoms,molecules,organisms,templates}/`.
- Componentes usam **Svelte 5 runes** (`$props()`, `$state()`) e **snippets** (`{#snippet}` / `{@render}`) — não `<slot />` legado.
- CSS scoped (`<style>` dentro do `.svelte`) é o padrão. CSS modules (`.module.css`) permitido para componentes complexos. Globais ficam em `app.css`.
- Inline `style="..."` permitido APENAS para valores dinâmicos (`style="width: {pct}%"`). Cores, fontes, bordas estáticas SEMPRE via tokens.

## Alternativas consideradas
- **Tailwind CSS** — descartado pela poluição visual em arquivos `.svelte`, perda de tokens semânticos, e necessidade de configurar plugins para tema dinâmico.
- **CSS-in-JS (Pigment/StyleX)** — descartado por overhead de runtime e divergência com a forma idiomática de Svelte.
- **Skeleton.dev / shadcn-svelte** — descartado por trazer opiniões fortes e dependência externa pesada para um dark-first próprio. Reavaliar se o DS interno crescer demais.
- **Material-design / Carbon** — descartado por estética que não combina com a identidade dark/azul do produto.

## Consequências
**Ganhos**
- Um único arquivo (`app.css`) define a paleta, fontes, sombras e gradientes inteiros.
- Mudança de tema é um `setAttribute('data-theme', ...)` — instantâneo.
- Componentes reutilizáveis ficam isolados em `design-system/`.

**Trade-offs**
- Manter `app.css` exige disciplina: dev pode esquecer de adicionar tokens novos para `[data-theme="light"]`.
- Atomic Design exige extrair componentes ativamente conforme regra dos 3+ usos — sem isso, vira pasta vazia e duplicação volta a aparecer nas pages.
- Sem Tailwind, criar variantes rápidas exige escrever CSS scoped (não copiar utility classes).

## Impacto em código, testes e operação
- **Estrutura**: `src/lib/design-system/` com `organisms/` (Sidebar, Notifications) e pastas atoms/molecules/templates a serem criadas conforme uso.
- **Lint**: regras manuais em `.claude/rules/02-design-system.md` (sem CI ainda — futuro: stylelint).
- **Testes**: componentes do DS são candidatos prioritários para testes Vitest + `@testing-library/svelte`.
- **Acessibilidade**: tokens incluem `--border-focus` e `:focus-visible` é exigido em interativos.

## ADRs relacionados
- ADR-0001 — Adoção SvelteKit + Tauri
- ADR-0003 — Estratégia de Reaproveitamento via Atomic Design
