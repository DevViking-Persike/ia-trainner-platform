# 07 — Slash Commands Gerados (v2)

**Data:** 2026-04-27
**Escopo:** Catálogo dos slash commands disponíveis em `.claude/commands/` e seu propósito na v2.

> ⚠️ Os arquivos `.md` em `.claude/commands/` herdam de versão anterior (v1 / Blazor). Conteúdo deles **não foi reescrito** nesta refatoração — recomenda-se revisar caso-a-caso quando começarem a divergir do estado da v2.

## Lista atual

### Implementação de feature
- **`/project:fe-analyze-feature`** — análise pré-implementação: escopo, reuso, impacto.
- **`/project:fe-implement-feature`** — implementação passo a passo respeitando Hexagonal + Dual-Mode + design system.
- **`/project:fe-create-component`** — criar componente Svelte respeitando Atomic Design.
- **`/project:fe-refactor-component`** — refatorar componente, store ou caso de uso.

### Testes
- **`/project:fe-add-tests`** — adicionar testes (Vitest + `@testing-library/svelte`).
- **`/project:fe-validate-tests`** — validar confiabilidade dos testes (sem dependências instáveis, sem flakes).

### Reviews
- **`/project:code-review`** — code review completo (código + governança).
- **`/project:quality-gate`** — quality gate consolidado, executar após reviews individuais.
- **`/project:review-documentacao-e-governanca`** — review de documentação e governança.
- **`/project:review-performance`** — review de performance.
- **`/project:review-seguranca`** — review de segurança.
- **`/project:review-testes`** — review de testes.
- **`/project:review-loop`** — meta-review iterativo.

## Recomendações de revisão dos commands

Os arquivos foram criados para o ciclo Blazor (v1). Devem ser auditados antes de uso intenso na v2:

| Command | Provável necessidade de update |
|---------|--------------------------------|
| `fe-create-component` | Trocar referências a Razor / `@code` / inline scoped CSS Blazor por Svelte 5 runes + snippets |
| `fe-add-tests` | Trocar xUnit + NSubstitute + FluentAssertions → Vitest + Testing Library |
| `fe-implement-feature` | Trocar MVVM ViewModel → Hexagonal use case + Dual-Mode service |
| `code-review`, `review-*` | Atualizar checklists para regras `01-08*.md` v2 |

> Plano: revisar e atualizar conforme primeira oportunidade real (ex: ao criar primeiro `Button` extraído ou primeiro caso de uso testado).

## Como usar

Em uma sessão Claude Code:
1. `cd /Volumes/HDX/Dev/ia-trainner-microservice-go/Frontend`
2. Digitar o slash command: `/project:fe-create-component`
3. Seguir o template guiado.

Os commands ficam visíveis na lista de skills do Claude Code automaticamente.
