# Review Loop — Orquestração iterativa de revisão e qualidade

Você é um engenheiro sênior orquestrando um loop iterativo de revisão e qualidade até a mudança ficar pronta para merge ou até ficar claro que ela ainda está bloqueada.

## Objetivo

Conduzir um processo de revisão em ciclos curtos, com critérios explícitos de entrada, escalonamento e parada.

## Instruções de execução

### Fase 1 — Mapear escopo

1. Identifique os arquivos alterados, a natureza da mudança e o risco aparente.
2. Classifique a mudança como: pequena | moderada | estrutural
3. Detecte se houve impacto em: arquitetura, contratos, testes, segurança, documentação, governança, ADRs.

### Fase 2 — Decidir quais revisões entram no ciclo

- **Sempre** rode análise equivalente a `code-review`.
- Rode `review-testes` se: houver testes novos, impacto em comportamento, mudança sem teste, ou refatoração com risco de falso positivo.
- Rode `create-adr` se: mudança estrutural, alteração de decisão arquitetural, contrato ou estratégia.
- Rode `review-documentacao-e-governanca` se: impacto em CLAUDE.md, ADRs, docs, commands ou regras, ou suspeita de drift.
- **Sempre** finalize com `quality-gate`.

### Fase 3 — Executar o ciclo

1. Rode code-review (leia diff, arquivos impactados, valide aderência a `.claude/rules/`).
2. Se aplicável, rode review-testes (valide cobertura, falso positivo/negativo).
3. Se aplicável, crie ADR (use template `docs/adrs/ADR-TEMPLATE.md`).
4. Se aplicável, rode review-documentacao-e-governanca.
5. Rode quality-gate (build, testes, consolidação).
6. Consolide os achados.

### Fase 4 — Decidir se o loop continua

Repita apenas se:
- achado crítico ou alto
- teste importante faltando ou fraco
- gate não aprovado
- ADR obrigatório faltante
- drift documental relevante
- correção aplicada após a rodada anterior

Não repita se:
- não houve mudança nova no código ou docs
- restarem apenas observações cosméticas
- o gate já estiver satisfatório

### Fase 5 — Condição de parada

Pare quando:
1. Não há mais bloqueios e a mudança está pronta para merge.
2. Restam apenas riscos residuais aceitáveis.
3. O loop atingiu 3 ciclos completos.
4. Há bloqueio que exige decisão humana.

## Limite de iterações

- Máximo: 3 ciclos completos
- Pode encerrar antes se suficientemente bom
- Não use loop infinito

## Regras

- Não reexecute os mesmos passos sem nova evidência.
- Cada ciclo deve registrar o que mudou desde o ciclo anterior.
- Não use o loop para polimento sem impacto.
- Priorize bugs, regressão, teste fraco, risco estrutural e ADR faltante.
- Se mudança pequena, ciclo curto. Se estrutural, mais rigoroso.

## Formato da saída

Gere `docs/review/review-loop.md` com:

1. Contexto da mudança
2. Escopo analisado
3. Classificação da mudança
4. Revisões acionadas no ciclo
5. Resumo por ciclo
6. Achados consolidados
7. Testes e validações pendentes
8. Aderência a ADRs
9. Drift documental encontrado
10. Estado final: pronto para merge | pronto com ressalvas | não pronto
11. Próxima ação recomendada

### Formato por ciclo

```markdown
## Ciclo N

**O que foi analisado:** ...
**Revisões executadas:** code-review | review-testes | quality-gate | ...
**Novos achados:** ...
**Pendências resolvidas desde o ciclo anterior:** ...
**Pendências restantes:** ...
**Decisão do ciclo:** continuar | encerrar | bloquear
```
