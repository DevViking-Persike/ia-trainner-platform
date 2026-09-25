# Review de Documentação e Governança — v2

**Data:** 2026-04-27
**Escopo:** CLAUDE.md, README, .claude/rules/, docs/adrs/, docs/analysis/, docs/architecture/, docs/review/, scripts/README.

## Status geral

🟢 **Bom** — toda a documentação foi reescrita nesta data para refletir o estado real do código v2 (SvelteKit + Tauri). Sem inconsistências significativas detectadas.

## Inventário

| Categoria | Arquivos | Estado |
|-----------|----------|--------|
| Raiz | CLAUDE.md, README.md | ✅ atualizados |
| Rules | `.claude/rules/01-08*.md` | ✅ atualizados |
| ADRs | `docs/adrs/ADR-0001-0006*.md` + TEMPLATE | ✅ atualizados |
| Análise | `docs/analysis/audit-and-clean-report.md`, `docs/analysis/frontend/01-07*.md`, `improvement-plan.md` | ✅ atualizados |
| Arquitetura | `docs/architecture/frontend/00-10*.md` | ✅ atualizados |
| Reviews | `docs/review/*.md` (7 arquivos) | ✅ atualizados |
| Scripts README | `scripts/README.md` | ⚠️ refatoração pendente (Fase 5 do plano) |

## Aderência das rules ao código

Cruzamento detalhado em `docs/analysis/frontend/06-regras-geradas.md`. Resumo:

| Rule | Aderência observada |
|------|---------------------|
| 01 — Arquitetura | 🟢 Alta |
| 02 — Design System | 🟢 Alta (com lacuna de tokens tipográficos) |
| 03 — Reaproveitamento | 🟡 Aplicada — mas pastas atoms/molecules vazias |
| 04 — Testes | 🔴 stack ausente |
| 05 — Service Layer | 🟢 Alta |
| 06 — Segurança | 🟡 Cookie não-JWT |
| 07 — Rotas | 🟡 Guard parcial (lacuna em `/profile`, `/teams`) |
| 08 — Migrações Pendentes | 🟢 Lista atualizada |

## Aderência das ADRs ao código

| ADR | Status declarado | Realidade |
|-----|------------------|-----------|
| 0001 — SvelteKit + Tauri | Implementado | ✅ |
| 0002 — Design System | Implementado | ✅ (com lacunas) |
| 0003 — Reaproveitamento | Aceito | ✅ (espera evolução) |
| 0004 — Testes | Proposto | ✅ (stack não instalada ainda) |
| 0005 — Hexagonal | Aceito (parcial) | ✅ (mocks ainda presentes) |
| 0006 — Auth Cookie + Tauri Store | Implementado (com débito JWT) | ✅ |

## Slash commands (`.claude/commands/`)

⚠️ Os 13 arquivos de slash command **herdam de v1 (Blazor)** e não foram refatorados nesta operação. Conteúdo deles ainda referencia ViewModels MVVM, xUnit/NSubstitute, etc.

**Recomendação**: refatorar conforme uso. Priorizar `fe-create-component`, `fe-add-tests`, `fe-implement-feature` quando começarem a ser usados.

## Estrutura de governança

✅ Bom:
- Rules numeradas (01-08) com tema claro por arquivo.
- ADRs versionados e relacionados.
- Análise dividida em 7 documentos sequenciais.
- Arquitetura em 11 documentos (00-10) cobrindo overview → onboarding.
- Review por dimensão (code, segurança, testes, performance, documentação, loop, quality-gate).

🟡 Pontos de atenção:
- Sem CONTRIBUTING.md (single-dev OK por enquanto).
- Sem CODE_OF_CONDUCT.md (single-dev OK).
- Sem CHANGELOG.md (git log + ADRs cobrem).

## Recomendações

1. **Próxima refatoração**: `.claude/commands/*.md` para tirar referências Blazor restantes.
2. **scripts/README.md**: parte da Fase 5 do plano — refatorar para refletir comandos npm/Tauri.
3. **CHANGELOG.md** (opcional): pode ajudar quando a v2 for promovida a deploy público.
4. **Doc dos comandos Rust**: documentar cada `#[tauri::command]` em `commands.rs` com docstring `///` (hoje minimal).

## Conclusão

Documentação está em **estado coerente** com o código real. As lacunas conhecidas estão **explicitamente declaradas** em `08-migracoes-pendentes.md` e nos riscos do `08-risks-and-tech-debt.md`. Sem dívida documental escondida.
