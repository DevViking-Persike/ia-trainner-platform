# Regras de Reaproveitamento

**Objetivo:** Evitar duplicação sem cair em abstração prematura. Decisões baseadas em frequência real.

## Hierarquia de componentes (Atomic Design)

Pasta: `src/lib/design-system/`

| Nível | Pasta | O que cabe |
|-------|-------|------------|
| **Atoms** | `atoms/` | Sem lógica — botão, badge, input, spinner, avatar, ícone |
| **Molecules** | `molecules/` | Composição de atoms com slots — card-header, alert, empty-state, form-field |
| **Organisms** | `organisms/` | Com lógica de domínio — Sidebar, Notifications, ChatPanel, JobList |
| **Templates** | `templates/` | Layouts de página completos — AppLayout, AuthLayout |

> Hoje só existe `organisms/` (Sidebar, Notifications). Atoms/molecules/templates a serem criados conforme necessidade — manter as pastas vazias **NÃO** é exigido; criar quando o primeiro componente do nível existir.

## Obrigatório

- Padrão de markup que aparece em **3+** páginas DEVE virar componente em `design-system/`.
- Componente DEVE declarar `Props` tipados (`interface ComponentProps { ... }` + `let { ... }: ComponentProps = $props()`) e valores default quando aplicável.
- Componente reutilizável DEVE ter comentário JSDoc com descrição e exemplo de uso, no topo do `<script>`.
- Slots usam **Svelte 5 snippets** (`{#snippet ...}` + `{@render ...}`). PROIBIDO `<slot />` legado em componentes novos.
- Ao identificar duplicação de lógica entre stores ou casos de uso, extrair função pura para `$lib/utils/` antes de criar nova base/abstração.

## Permitido

- Padrão com **2** ocorrências PODE permanecer duplicado. Extrair na 3ª ocorrência.
- Componente com `RenderFragment` / snippet PODE ser criado quando estrutura é fixa mas conteúdo varia.
- Migração progressiva — não é obrigatório eliminar todas as duplicações de uma vez.
- Componente atom muito específico (ex: ícone único) PODE viver junto da página que o usa, se nunca foi reusado.

## Proibido

- PROIBIDO criar componente genérico com mais de **8 props** — sinal de abstração prematura. Quebrar em variantes.
- PROIBIDO criar `BaseComponent` ou herança via composição forçada quando 2 componentes apenas se parecem.
- PROIBIDO criar utilitário compartilhado com mais de 1 caller. Esperar 3+ chamadas reais.
- PROIBIDO mover lógica de caso de uso para `lib/utils/`. Casos de uso ficam em `lib/server/<modulo>/application/`. `utils/` é só para funções puras sem dependência (formatação, validação simples, parsing).
- PROIBIDO criar abstrações compartilhadas entre pages do grupo `(app)` e `(auth)` — eles têm propósitos distintos (autenticado vs público).

## Sinais de alerta

- Mesmo bloco de markup copiado em página nova — virar componente.
- Componente com 4+ `{#if}` aninhados acomodando usos diferentes — provavelmente genérico demais. Quebrar.
- Caso de uso chamado por 2 páginas com semânticas diferentes — provavelmente são 2 casos de uso distintos.
- Snippet definido inline com mais de 30 linhas — extrair componente.
