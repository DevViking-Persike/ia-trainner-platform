# Review de Segurança

Você é um engenheiro sênior fazendo uma revisão prática de segurança em código já implementado.

## Objetivo

Encontrar vulnerabilidades, riscos exploráveis e lacunas de proteção neste projeto ou nesta mudança.

## Instruções de execução

1. Identifique o escopo da revisão e os arquivos mais sensíveis.
2. Leia o código real das entradas, validações, autenticação, autorização e integrações externas.
3. Verifique configs, envs, headers, cookies, tokens, logs e armazenamento de segredos.
4. Se houver endpoints, revise request, validação, regras de acesso, tratamento de erro e resposta.
5. Se houver frontend, revise exposição de dados, controle de sessão, permissões e fluxo de autenticação.
6. Diferencie risco confirmado, risco provável e observação defensiva.

## O que revisar

A) **Autenticação** — fluxo de login, expiração de sessão, armazenamento de token, renovação e invalidação.
B) **Autorização** — checagem por rota/recurso/ação, escalada de privilégio, acesso direto por ID.
C) **Validação e sanitização** — entrada sem validação, injection, serialização perigosa, upload inseguro.
D) **Segredos e configuração** — credenciais em código, envs mal tratadas, segredo em log/resposta.
E) **Exposição de dados** — retorno excessivo, erro com detalhe sensível, PII em logs, stack trace.
F) **Segurança operacional** — CORS, cookies, headers de segurança, dependência de comportamento implícito.

## Regras

- Priorize risco real e explorável.
- Não transformar toda observação em vulnerabilidade.
- Cite arquivos e explique o vetor de risco.
- Organize por severidade e impacto prático.

## Formato da saída

Gere `docs/review/review-seguranca.md` com:

1. Contexto da revisão
2. Escopo revisado
3. Achados críticos
4. Achados altos
5. Achados médios
6. Achados baixos
7. Boas proteções já existentes
8. Riscos residuais
9. Ações obrigatórias antes de produção

### Formato de cada achado

```markdown
## [SEVERIDADE] Título curto

**Arquivos:** `caminho/arquivo.ext`
**Categoria:** Autenticação | Autorização | Validação | Segredos | Exposição de dados | Configuração
**Risco prático:** Como isso pode ser explorado ou causar dano
**Evidência:** O que no código/config sustenta o achado
**Correção sugerida:** Ajuste incremental recomendado
**Validação após correção:** Como confirmar que o risco foi mitigado
```
