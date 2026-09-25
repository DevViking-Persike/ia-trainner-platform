# IA Trainner Platform

Repositório principal da plataforma de documentos, RAG e treinamento de modelos.

Endereço web: **https://ia-trainner.victorpersike.dev.br**. DNS, TLS e bootstrap do cluster pertencem ao `infra-k8s`.

| Componente | Tecnologia | Caminho |
|---|---|---|
| Frontend | Angular 22 | `apps/frontend` |
| API e executor | .NET 10 LTS, Clean/Hexagonal e DDD | `services/backend` |
| Treinamento | Python, Jobs Kubernetes na P7 | `services/training-python` |
| Esquema do banco | SQL DDL (Flyway) | `database/ia-trainner-sql-ddl` |
| Dados de referência | SQL DML (Flyway) | `database/ia-trainner-sql-dml` |
| Referências de migração | Go e autenticação .NET antiga | `legacy/backend-go`, `legacy/auth-keycloak-dotnet` |
| Frontend anterior | SvelteKit/Tauri preservado | `legacy/frontend-svelte` |

Este repositório fixa os commits dos componentes como **submódulos Git**. Os componentes permanecem privados e exigem acesso próprio. Tornar o principal público não publica seus conteúdos.

## Começar

```sh
git clone https://github.com/DevViking-Persike/ia-trainner-platform.git
cd ia-trainner-platform
python3 scripts/workspace.py init
python3 scripts/workspace.py check
python3 scripts/workspace.py link-dev
```

Os checkouts reais ficam dentro do principal. `link-dev` cria atalhos por symlink ao lado dele, sem duplicar dados e sem sobrescrever diretórios existentes. Symlinks são locais; GitHub recebe gitlinks de modo `160000`. O legado usa `update = none`; para consultá-lo explicitamente, execute `python3 scripts/workspace.py init --legacy`. Não inicialize seus submódulos recursivamente: eles contêm infraestrutura e secrets históricos privados.

```sh
cd apps/frontend
npm ci
npm start

# Em outro terminal, a partir da raiz:
dotnet run --project services/backend/src/IATrainner.Api
```

O marco M1 (acesso) entrega login ZITADEL com PKCE, área interna em `/app` e API .NET na mesma origem: `/api/healthz` público, `/api/me` e `/api/platform` exigem token do projeto ZITADEL "IA Trainner" com a função `user`. Sem configuração ZITADEL, a API não aceita acesso autenticado. Documentos, RAG, persistência, outbox/Kafka e treinamento ainda precisam ser implementados; o Worker não tem consumidor Kafka. Progresso por marco em [development-status](docs/operations/development-status.md).

## Configuração e segredos

Copie `config/infisical.example.json` para `.infisical.local.json`, configure apenas localização/ambiente e autentique com `infisical login`. Esse arquivo local é ignorado. Valores vêm do Infisical somente durante a execução:

```sh
python3 scripts/with-infisical.py backend -- dotnet run --project services/backend/src/IATrainner.Api
python3 scripts/with-infisical.py training -- finetuning train --list-models
```

Cada processo recebe seu escopo. O Angular e os clientes nativos nunca recebem chaves Gemini, senhas de bancos ou tokens administrativos. As pastas de backend/treinamento precisam ser configuradas; nenhum segredo administrativo é copiado automaticamente da raiz do projeto Infisical.

## Entrega

GitHub Actions valida os componentes e segue a referência `site-persike-svelte`: imagem OCI → Zot com digest → branch `gitops` → Argo CD → verificação da release. Credenciais de publicação são obtidas do Infisical por OIDC, sem valores no repositório ou nos build args. O frontend tem publicação habilitada no domínio oficial. Backend e Python permanecem com publicação desativada até concluir seus pré-requisitos de runtime. Python publica uma imagem de Job; CI nunca inicia treino.

Veja [arquitetura atual](docs/architecture/platform.md), [configuração de entrega](docs/operations/delivery.md) e [política de segurança](SECURITY.md).

Para desenvolver os próximos fluxos com Claude Code, use o [workflow de entrega por marcos](docs/workflows/claude-delivery.md), começando por `/entregar-plataforma acesso`.

## Histórico da migração

O principal público começa com um snapshot limpo. O repositório anterior `workflows-ia-trainner` continua privado porque seu histórico contém uma credencial antiga. Nenhum histórico remoto foi reescrito. As referências privadas locais são apenas para recuperação: não executar `git push --all` ou `--mirror`.
