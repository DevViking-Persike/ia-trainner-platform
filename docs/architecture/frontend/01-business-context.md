# 01 — Contexto de Negócio

**Última atualização:** 2026-04-27

## Visão do produto

**IA Trainner** é uma plataforma para acadêmicos (estudantes, pesquisadores, professores) que precisam:

1. Treinar (fine-tunar) modelos LLM locais com seus próprios datasets de pesquisa.
2. Construir RAG (Retrieval-Augmented Generation) sobre coleções de documentos para consultar e analisar literatura.
3. Compartilhar modelos treinados e coleções RAG com colegas/equipes de pesquisa.

A plataforma roda em hardware do laboratório (Ganesha — RTX 3060 12 GB, Ryzen 7 8700G, 60 GB RAM) e expõe Web + Desktop + Mobile.

## Atores

| Ator | Papel |
|------|-------|
| **Pesquisador individual** | Cria jobs de fine-tuning, sobe documentos para RAG, faz chat com modelos |
| **Líder de equipe** | Cria team, convida pesquisadores por email, gerencia membros |
| **Membro de equipe** | Compartilha jobs/coleções, acessa modelos da equipe |
| **Admin do servidor** | Não tem UI dedicada hoje; gerencia infra via K8s/SSH |

## Casos de uso principais

### Treinamento (Training)
- Criar job: nome, dataset path, modelo base (alias Ollama), épocas, learning rate, batch size.
- Iniciar / cancelar / deletar job.
- Ver progresso em tempo real (futuro: WebSocket/SSE).
- Compartilhar modelo treinado com equipe.

### RAG
- Criar coleção (workspace) com nome + descrição.
- Upload de documentos (PDF, TXT, MD).
- Indexação automática (chunking + embedding).
- Query: pergunta em linguagem natural → resposta gerada com contexto recuperado.
- Modos: query (RAG completo) ou search (apenas busca semântica).

### Modelos
- Listar modelos Ollama disponíveis (de `OLLAMA_HOST`).
- Ver tamanho, parâmetros, VRAM, alias.
- Chat direto com modelo (sem RAG).

### Equipes
- Criar equipe, convidar por email (gera convite via email SES).
- Ver membros, papel (owner/member), remover membros.
- Compartilhar recursos com a equipe (`tenant_cia_id` no banco).

### Auth
- Cadastro com validação (nome, email, senha 12+ chars com maiúscula/minúscula/número, instituição).
- Verificação de email obrigatória antes de login.
- Login bloqueia se `email_verified=false`.
- Logout limpa cookie/Tauri Store.

## Restrições de negócio

- **Email obrigatório verificado** antes de uso. Reenvio disponível.
- **Senha forte** (12+ chars, maiúscula, minúscula, número, especiais OK).
- **Multi-tenancy**:
  - `tenant_id` = `sub` do JWT Keycloak (usuário).
  - `tenant_cia_id` = UUID da equipe (NULL se privado).
  - Queries retornam recursos do user + recursos compartilhados de equipes que o user participa.
- **GPU única** (RTX 3060) — fila serializada de jobs (1 ativo por vez).
- **Plano** do usuário define `limite_jobs` (campo `plano` em `AuthUserInfo`).

## Restrições técnicas

- Backends estão fora do controle do frontend — frontend nunca acessa banco direto. Apenas HTTP REST.
- Keycloak roda em subpath (`https://victorpersike.dev.br/keycloak/realms/ptah`), não subdomínio.
- Amazon SES em sandbox — apenas para emails verificados (saída do sandbox é pendência).
- Toda UI em PT-BR. Sem i18n no momento.

## Glossário

| Termo | Definição |
|-------|-----------|
| **Job** | Tarefa de fine-tuning enfileirada na GPU |
| **Modelo treinado** | Resultado de um job de fine-tuning |
| **Workspace / Coleção RAG** | Conjunto de documentos indexados em Qdrant (collection) com nome `{userId}_{workspaceName}` |
| **Equipe / Tenant Cia** | Grupo de usuários que compartilham recursos |
| **Smart**, **Fast**, **Llama**, etc. | Aliases de modelos Ollama (definidos em `OLLAMA_MODELS`) |
| **Embedding** | Vetor produzido por mxbai-embed-large (1024 dims) |
| **Chunk** | Pedaço de documento indexado para RAG |

## Stakeholders

- **Dev solo** (responsável por todo o frontend e maior parte do backend).
- **Usuários alpha**: pesquisadores próximos ao dev.
- Sem produto manager / UX designer dedicado — decisões tomadas pelo dev.

## Métricas de negócio (futuro)

Não há analytics implementado ainda. Métricas planejadas:
- Usuários ativos diários
- Jobs criados / concluídos por semana
- Documentos indexados / queries por dia
- Tempo médio de fine-tuning
- Taxa de erro por feature

## Diferenciais vs alternativas

- **Tudo local** (sem Cloud APIs como OpenAI / Anthropic) — privacidade dos datasets de pesquisa.
- **Fine-tuning visual** (sem precisar editar YAML do llama-factory).
- **RAG sem custo recorrente** (modelos Ollama no host).
- **Multi-plataforma** (Web + Desktop + iOS + Android via Tauri 2).
