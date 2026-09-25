# ADR-0003 — Estratégia de Reaproveitamento (Atomic Design + regra dos 3+ usos)

## Status
Aceito

## Data
2026-04-27

## Contexto
Em projetos pequenos com um dev, abstração prematura é o maior risco. Já em projetos crescendo, duplicação invisível corrói qualidade. A v2 está no início — é fácil tanto criar componentes genéricos demais quanto duplicar markup repetidamente.

Precisamos de uma regra simples, explícita e contornável quando faz sentido.

## Decisão
- Adotar **Atomic Design** com 4 níveis: `atoms`, `molecules`, `organisms`, `templates` em `src/lib/design-system/`.
- **Regra dos 3+ usos**: padrão de markup em 2 páginas pode permanecer duplicado; a partir de 3, vira componente.
- Componentes usam **Svelte 5 snippets** (`{#snippet}` / `{@render}`) — sem `<slot />`.
- Props tipados via interface TypeScript explícita: `interface XxxProps { ... }` + `let { ... }: XxxProps = $props()`.
- Componente novo com mais de 8 props é sinal de abstração prematura — quebrar em variantes.
- Para lógica compartilhada (não-UI), funções puras vão para `src/lib/utils/`. Caso de uso (negócio) **não** é candidato a `utils/`.

## Alternativas consideradas
- **DRY agressivo (extrair com 2+ usos)** — descartado: gera abstrações que só servem 2 lugares e atrapalham quando o 3º caso é diferente.
- **Sem hierarquia (componentes "flat")** — descartado: rapidamente vira pasta com 50 componentes sem ordem clara.
- **Headless UI (Bits UI / Melt UI)** — não descartado em definitivo. Será reavaliado se precisarmos de combobox/select complexos com a11y séria. Por enquanto, escrever componentes próprios com tokens CSS atende.

## Consequências
**Ganhos**
- Componentes só nascem quando há uso real comprovado.
- Hierarquia atomic dá local previsível para procurar antes de criar novo.
- Snippets do Svelte 5 permitem composição flexível sem `<slot>` legado.

**Trade-offs**
- Disciplina: dev precisa lembrar de extrair na 3ª ocorrência (sem ferramenta detectando).
- Em refactor, mover de `atoms/` para `molecules/` exige atenção a imports.
- Dois usos divergem com o tempo — sem reuso, mais código para manter.

## Impacto em código, testes e operação
- **Hoje (2026-04-27)**: existe apenas `design-system/organisms/` com `Sidebar.svelte` e `Notifications.svelte`. Pastas `atoms`, `molecules`, `templates` serão criadas quando o primeiro componente do nível existir.
- **Lint manual**: revisar PRs para detectar duplicação não-extraída.
- **Testes**: cada componente do DS deve ter teste mínimo de render + interação principal.

## ADRs relacionados
- ADR-0002 — Governança do Design System
