# Review de Documentação e Governança

Você é um engenheiro sênior revisando aderência entre código, documentação e governança operacional.

## Objetivo

Detectar drift entre o que o projeto documenta e o que o código realmente faz hoje.

## Instruções de execução

1. Leia `CLAUDE.md`, `.claude/rules/`, `docs/analysis/`, `docs/architecture/` e `.claude/commands/` conforme existirem.
2. Leia o código real nas áreas impactadas para validar se a documentação ainda faz sentido.
3. Verifique se commands, regras e documentação mandam fazer algo que o projeto já não suporta mais.
4. Verifique se mudanças recentes exigem atualização documental que não foi feita.
5. Diferencie inconsistência crítica, inconsistência moderada e melhoria de clareza.

## O que revisar

A) **CLAUDE.md** — comandos válidos, fluxo operacional coerente, riscos e instruções atuais.
B) **.claude/rules/** — regras aplicáveis ao código atual, conflitos entre regras.
C) **Commands** — command obsoleto, incompleto, dependente de artefato inexistente.
D) **Docs de análise e arquitetura** — conclusões válidas, nomes coerentes, recomendações superadas.
E) **Governança** — padrão duplicado, arquivo obrigatório ausente, processo inexecutável.

## Regras

- Não trate falta de detalhe como erro automaticamente.
- Priorize inconsistências que induzem execução errada.
- Cite o arquivo documental e o arquivo de código que se contradizem.

## Formato da saída

Gere `docs/review/review-documentacao-e-governanca.md` com:

1. Contexto da revisão
2. Escopo revisado
3. Inconsistências críticas
4. Inconsistências moderadas
5. Melhorias de clareza
6. Documentação que continua correta
7. Riscos de drift residual
8. Ações recomendadas

### Formato de cada problema

```markdown
## [SEVERIDADE] Título curto

**Arquivos envolvidos:** `doc/arquivo.md`, `codigo/arquivo.ext`
**Tipo:** Drift documental | Command obsoleto | Regra conflitante | Artefato faltante | Governança duplicada
**Impacto:** Como isso pode induzir erro operacional ou técnico
**Evidência:** O que na doc diverge do código real
**Correção sugerida:** Atualização mínima necessária
**Prioridade:** Agora | Próximo ciclo | Quando tocar a área
```
