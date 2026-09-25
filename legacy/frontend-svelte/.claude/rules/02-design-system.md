# Regras do Design System

**Objetivo:** Manter consistência visual via tokens CSS centralizados e componentes Svelte reutilizáveis.

## Fonte da verdade
- Tokens globais ficam em `src/app.css` (~800 linhas, dark-first).
- Tema ativo via atributo `data-theme="dark"` ou `data-theme="light"` no `<html>` (controlado por `$lib/stores/theme.ts`).

## Tokens disponíveis (resumo)

| Categoria | Variáveis principais |
|-----------|---------------------|
| Backgrounds | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-surface`, `--bg-surface-hover`, `--bg-surface-active`, `--bg-elevated`, `--bg-overlay` |
| Bordas | `--border-primary`, `--border-secondary`, `--border-accent`, `--border-focus` |
| Texto | `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`, `--text-inverse` |
| Brand / Accent | `--color-primary`, `--color-primary-hover`, `--color-primary-active`, `--color-primary-bg`, `--color-primary-glow` |
| Semânticas | `--color-success`, `--color-warning`, `--color-error`, `--color-info` (com `-bg` cada uma) |
| Gradientes | `--gradient-primary`, `--gradient-surface` |
| Tipografia | `Inter` (sans), `JetBrains Mono` (mono) — importadas no topo de `app.css` |

> Conferir lista completa em `src/app.css` antes de criar nova cor — provavelmente já existe token equivalente.

## Obrigatório

- Toda cor DEVE usar `var(--*)` definida em `app.css`. Hex/rgb hardcoded é PROIBIDO.
- Tema dark é o padrão. Toda nova variável DEVE ter valor para `[data-theme="dark"]` E `[data-theme="light"]`.
- Padrões visuais repetidos (loading, alerts, empty state, page header, card, badge) DEVEM ser componentes Svelte em `src/lib/design-system/{atoms,molecules,organisms,templates}`.
- Elementos interativos (botão, link, input) DEVEM ter `:hover` e `:focus-visible` definidos.
- Botões icon-only DEVEM ter `aria-label`.
- `<label>` DEVE ter `for="..."` ligado ao `id` do input.
- CSS scoped (`<style>` dentro do `.svelte`) é o padrão — escopo automático Svelte. Usar para estilos exclusivos do componente.
- Estilos globais ou utilitários compartilhados ficam em `app.css`. Adicionar nova classe global APENAS se aparece em ≥3 componentes.

## Permitido

- Inline `style="..."` APENAS para valores dinâmicos calculados em runtime (ex: `style="width: {percentual}%"`). Nunca para cor, fonte, espaçamento ou borda estática.
- CSS modules (`.module.css`) PODEM ser usados para componentes complexos com múltiplas variantes. Documentar no comment do topo.
- Animações novas em `@keyframes` no `app.css` se reutilizadas; em `<style>` scoped se exclusivas.
- Adicionar token novo em `app.css` quando representa conceito reutilizável (não uma cor pontual).

## Proibido

- PROIBIDO `style="color: #6366f1"` ou qualquer cor hardcoded em markup.
- PROIBIDO criar `--minha-cor: #ff0000` em `<style>` de componente — tokens vivem em `app.css`.
- PROIBIDO duplicar SVG icon inline. Reutilizado → componente atom em `src/lib/design-system/atoms/`.
- PROIBIDO criar nova classe `.card-variante` redeclarando `background`, `border-radius`, etc. quando `.card` base existe — usar composição (`.card.variante`).
- PROIBIDO usar `!important` para resolver conflitos — corrigir cascata.

## Sinais de alerta

- Componente com mais de 5 inline styles — provavelmente precisa CSS scoped ou classes.
- Cor hex que não é token — provavelmente já existe equivalente em `app.css`.
- Elemento interativo sem `:hover` ou `:focus-visible`.
- Variante de componente que reimplementa estrutura — extrair via `RenderFragment` (Svelte snippets) ou prop.
