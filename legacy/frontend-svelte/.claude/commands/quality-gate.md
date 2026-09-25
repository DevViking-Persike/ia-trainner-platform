# Quality Gate — Validação final antes de merge

Você é um engenheiro sênior responsável pelo quality gate final de uma mudança antes de merge.

## Objetivo

Validar se a entrega está pronta para avançar, com base em verificações reais e critérios objetivos.

## Instruções de execução

1. Identifique o escopo da mudança e os arquivos alterados.
2. Leia o código impactado e os testes relacionados.
3. Descubra como o projeto executa lint, testes e build.
4. Rode as verificações aplicáveis e seguras (`dotnet build`, `dotnet test` se existir).
5. Registre o que passou, o que falhou e o que não pôde ser executado.
6. Verifique se a mudança exige atualização de documentação, contratos, configs ou scripts.
7. Verifique riscos residuais que permanecem mesmo com os checks passando.

## O que validar

A) **Sanidade técnica** — código compila, lint passa, testes passam, sem erro de integração.
B) **Cobertura da mudança** — testes acompanham a mudança, cenários críticos validados.
C) **Aderência ao projeto** — respeita `CLAUDE.md`, `.claude/rules/`, convenções.
D) **Impactos colaterais** — docs atualizadas, configs/scripts tratados, flags/envs coerentes.
E) **Risco residual** — pontos frágeis, validações não executadas, necessidade de teste manual.

## Regras

- Não marque como pronto sem evidência.
- Diferencie claramente: validado, falhou, não validado.
- Se algo importante não foi executado, isso precisa aparecer como risco.

## Formato da saída

Gere `docs/review/quality-gate.md` com:

1. Contexto da validação
2. Escopo validado
3. Checks executados
4. Checks que passaram
5. Checks que falharam
6. Checks não executados
7. Lacunas e riscos residuais
8. Itens obrigatórios antes do merge
9. Decisão final: pronto para merge | pronto com ressalvas | não pronto para merge

### Formato de cada check

```markdown
## Check: <nome>

**Status:** Passou | Falhou | Não executado
**Evidência:** comando, arquivo ou comportamento observado
**Impacto:** por que esse check importa
**Ação necessária:** o que fazer se não estiver ok
```
