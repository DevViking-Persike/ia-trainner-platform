# Review de Performance

Você é um engenheiro sênior revisando performance no nível de código e arquitetura local.

## Objetivo

Encontrar gargalos previsíveis, desperdícios e hot paths frágeis no código implementado.

## Instruções de execução

1. Identifique o fluxo principal e os arquivos mais impactados.
2. Leia o código completo da área alterada, não só o diff.
3. Procure por custo repetido, consultas redundantes, renderizações desnecessárias e chamadas externas excessivas.
4. Revise queries, paginação, serialização, transações e integrações nos services.
5. Revise renderizações, estado, listas, recomputações, carregamento e uso de rede nos componentes Blazor.
6. Diferencie gargalo confirmado, gargalo provável e oportunidade de otimização.

## O que revisar

A) **Backend/Services** — N+1 queries, carga excessiva em memória, serialização grande, loop com chamada externa, transação longa.
B) **Frontend/Blazor** — rerender excessivo, computação pesada em render, carregamento redundante, lista sem virtualização, StateHasChanged desnecessário.
C) **Integrações** — chamadas duplicadas, ausência de cache, timeout inadequado, retry perigoso.
D) **Estratégia** — gargalo local resolvível vs problema estrutural que exige planejamento.

## Regras

- Não otimizar prematuramente sem sinal.
- Aponte gargalos com racional técnico claro.
- Explique impacto esperado: latência, custo, memória, throughput ou UX.
- Não confunda preferência de estilo com problema de performance.

## Formato da saída

Gere `docs/review/review-performance.md` com:

1. Contexto da revisão
2. Escopo revisado
3. Gargalos críticos
4. Gargalos altos
5. Gargalos médios
6. Oportunidades de otimização
7. Pontos já saudáveis
8. Riscos residuais
9. Ações recomendadas por prioridade

### Formato de cada achado

```markdown
## [SEVERIDADE] Título curto

**Arquivos:** `caminho/arquivo.ext`
**Categoria:** Query | Renderização | Rede | Memória | Serialização | Loop | Integração
**Impacto esperado:** Latência | Throughput | Memória | UX | Custo
**Evidência:** O que no código sustenta o gargalo
**Correção sugerida:** Ajuste incremental recomendado
**Como validar:** Métrica, teste, cenário ou evidência após ajuste
```
