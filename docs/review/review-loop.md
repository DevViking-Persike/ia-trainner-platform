# Review Loop — Pós-refatoração de Documentação

**Data:** 2026-04-27
**Escopo:** Validação cruzada após reescrita das rules, ADRs, análise, arquitetura e reviews para SvelteKit + Tauri.

## O que é "review-loop"

Meta-review iterativo que verifica **consistência entre documentos** depois que múltiplos arquivos são tocados de uma vez. Catalisa achados que cada review individual sozinho não pegaria.

## Verificações realizadas

### 1. Coerência entre regras e código
- ✅ `.claude/rules/01-08*.md` foram cruzadas com `src/` em `docs/analysis/frontend/06-regras-geradas.md`. Sem incoerências críticas.

### 2. Coerência entre ADRs e regras
- ✅ ADR-0001 (SvelteKit + Tauri) ↔ rule 01 (Arquitetura).
- ✅ ADR-0002 (Design System) ↔ rule 02.
- ✅ ADR-0003 (Reaproveitamento) ↔ rule 03.
- ✅ ADR-0004 (Testes) ↔ rule 04.
- ✅ ADR-0005 (Hexagonal SSR + SPA) ↔ rules 01 e 05.
- ✅ ADR-0006 (Auth Cookie + Tauri Store) ↔ rule 06.

### 3. Coerência entre análise e arquitetura
- ✅ `analysis/frontend/01-mapeamento-inicial.md` lista as mesmas 6 áreas hexagonais que `architecture/frontend/03-folder-structure.md`.
- ✅ Tokens CSS contados em `analysis/frontend/03-design-system.md` batem com `architecture/frontend/05-design-system-analysis.md`.
- ✅ Riscos em `architecture/frontend/08-risks-and-tech-debt.md` batem com migrações em `.claude/rules/08-migracoes-pendentes.md`.

### 4. Coerência entre reviews
- ✅ `code-review.md` cita os mesmos achados que `review-seguranca.md` (cookie não-JWT, CSP nulo, secure flag).
- ✅ `review-testes.md` consistente com `analysis/frontend/05-diagnostico-testes.md` e ADR-0004.
- ✅ `quality-gate.md` consolida critérios dos reviews individuais.

### 5. Tonelada de número 27
- 9 arquivos de análise + 11 de arquitetura + 7 de review = 27 ✓

## Achados do loop

| # | Achado | Severidade | Ação |
|---|--------|-----------|------|
| L1 | Slash commands em `.claude/commands/*.md` ainda têm conteúdo v1 (Blazor) | 🟡 | Refatorar conforme uso |
| L2 | `scripts/README.md` ainda menciona `.NET publish` | 🟡 | Fase 5 do plano (refatorar scripts) |
| L3 | `CLAUDE.md` raiz do superprojeto (`ia-trainner-microservico/CLAUDE.md`) ainda fala de Blazor | 🟡 | Fase 6 do plano |
| L4 | Algumas pages do app não têm `+page.server.ts` (training, profile, models/chat, rag/chat) | 🟢 | Esperado em fase MVP — quando HTTP repos chegarem, criar SSR loaders |
| L5 | `docs/adrs/ADR-0006` mudou de tema (Chat History → Auth) | 🟢 | Documentado em `audit-and-clean-report.md` |

## Sugestões para próximas iterações de review-loop

- Após Fase A (instalação testes + CI): rodar review-loop verificando `04-testes.md` ↔ código real.
- Após Fase B (HTTP repos): cruzar `08-risks-and-tech-debt.md` (R1) com infra real e baixar severidade de R1.
- Após Fase F (deploy): adicionar review novo de `release-readiness.md`.

## Como replicar este review

1. Listar todos os arquivos `.md` modificados na sessão (`git log --name-only`).
2. Para cada par de docs que se referenciam (ex: rule 04 ↔ ADR-0004 ↔ analysis/05 ↔ review-testes), abrir lado-a-lado.
3. Verificar:
   - Datas batem
   - Status batem
   - Métricas/contagens batem
   - Recomendações não conflitam
4. Registrar achados nesta seção.
