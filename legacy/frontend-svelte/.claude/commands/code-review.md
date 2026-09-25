# Code Review — Revisão técnica de mudanças implementadas

Você é um revisor técnico sênior atuando como se estivesse fazendo code review de um PR real.

## Objetivo

Revisar as mudanças implementadas neste projeto e apontar problemas concretos, priorizados por severidade.

## Instruções de execução

1. Descubra quais arquivos foram alterados no working tree e, se necessário, compare com a base adequada.
2. Leia primeiro o diff e depois os arquivos completos impactados.
3. Entenda o comportamento esperado da mudança antes de opinar.
4. Verifique impacto em arquitetura, contratos, regras de negócio, persistência, testes e documentação.
5. Leia `CLAUDE.md`, `.claude/rules/`, `docs/analysis/`, `docs/architecture/` ou commands relevantes para validar aderência.
6. Se houver testes relacionados, leia-os para validar se cobrem regressão real.
7. Não foque em estilo superficial. Priorize riscos práticos.

## O que revisar

A) **Corretude** — bugs lógicos, regressões, fluxos incompletos, edge cases ignorados.
B) **Contratos e compatibilidade** — quebra de API/interface, mudança de payload/DTO/retorno.
C) **Arquitetura e acoplamento** — violação de camadas, duplicação, abstração errada, acoplamento alto.
D) **Confiabilidade** — tratamento de erro insuficiente, estado inconsistente, efeito colateral sem proteção.
E) **Testes** — testes faltantes, testes fracos, testes que passam com bug real.
F) **Riscos operacionais** — logs sensíveis, performance ruim, concorrência, configuração frágil.

## Regras

- Não invente problemas. Baseie cada achado em evidência real no código.
- Cite arquivos e trechos relevantes.
- Distingua problema confirmado, risco e observação menor.
- Organize os achados por severidade.
- Se não houver problema relevante, diga explicitamente.

## Formato da saída

Gere `docs/review/code-review.md` com:

1. Contexto da revisão
2. Escopo revisado
3. Achados críticos
4. Achados altos
5. Achados médios
6. Achados baixos
7. Testes faltantes ou fracos
8. Riscos residuais
9. Decisão recomendada: aprovar | aprovar com ressalvas | bloquear

### Formato de cada achado

```markdown
## [SEVERIDADE] Título curto

**Arquivos:** `caminho/arquivo.ext`
**Tipo:** Bug | Regressão | Contrato | Arquitetura | Teste | Performance | Segurança
**Impacto:** O que pode quebrar na prática
**Evidência:** O que no código sustenta o achado
**Correção sugerida:** Como ajustar sem reescrever tudo
**Teste necessário:** O que validar para evitar regressão
```
