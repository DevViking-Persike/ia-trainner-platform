# Entrega por GitHub Actions e Argo CD

Padrão derivado de `site-persike-svelte`: verificar código e histórico, construir imagem OCI amd64, publicar no Zot com revisão imutável e digest confirmado, atualizar branch `gitops`, aguardar Argo CD e verificar a revisão HTTP. O principal valida a composição; cada componente constrói sua própria imagem.

## Configuração sem credenciais no Git

Configure variáveis de repositório/ambiente **não sensíveis** no GitHub:

| Variável | Uso |
|---|---|
| `DEPLOY_ENABLED` | `true` somente depois do bootstrap abaixo |
| `CI_REGISTRY` | Host do Zot acessível ao runner |
| `CI_IMAGE_PULL_REGISTRY` | Host usado pelos nós; se omitido, usa CI_REGISTRY |
| `INFISICAL_DOMAIN` | URL base do Infisical, sem `/api` para a action |
| `INFISICAL_IDENTITY_ID` | Identificador público de identidade OIDC |
| `INFISICAL_PROJECT_SLUG` | Projeto com permissão para ler `/zot` |
| `INFISICAL_ENVIRONMENT` | Ambiente a consultar |
| `INFISICAL_OIDC_AUDIENCE` | Audience exata configurada na confiança OIDC |
| `HEALTH_URL` | URL HTTPS de `/healthz` para API/frontend |

`ZOT_USER` e `ZOT_PASSWORD` já existentes em `/zot` são obtidos pela action Infisical somente depois do build. Nenhum segredo é argumento Docker. Não copiar credenciais de runtime para GitHub Secrets. PRs nunca executam o job de publicação.

Criar identidade Infisical de leitura restrita a `/zot` e vinculá-la ao repository/environment/branch do workflow. Configurar issuer GitHub, audience e subject exatos. Repositórios novos podem usar subjects imutáveis com IDs: confirmar as claims efetivas, sem publicar o JWT. Não usar subject curinga. Referência: [OIDC na action Infisical](https://infisical.com/docs/integrations/cicd/githubactions).

## Bootstrap em infra-k8s

Antes de habilitar entrega, configurar namespace `ia-trainner`, pull secret `zot-creds` sincronizado do Infisical, rotas TLS, política de rede e Applications Argo CD com permissão de leitura dos repositórios privados. API referencia Secret `ia-trainner-backend`; deve ser sincronizado pelo operador com escopo da aplicação. O principal não administra bancos, credenciais de infraestrutura ou RBAC global.

| Escopo proposto no Infisical | Variáveis |
|---|---|
| `/ia-trainner/backend` | `Authentication__Authority`, `Authentication__Audience`, `OTEL_EXPORTER_OTLP_ENDPOINT`; credenciais das integrações quando seus adaptadores forem implementados |
| `/ia-trainner/training` | `FINETUNING_DATABASE_URL`, credenciais restritas de artefatos, configuração de execução |
| `/embedding` existente | `sdk-gemini-1`, `sdk-gemini-2`; mapear para nomes aceitos pelo backend, sem renomear/destruir as chaves existentes |
| `/zot` existente | `ZOT_USER`, `ZOT_PASSWORD` |

Não foi criada aplicação OIDC ZITADEL nem escolhido audience arbitrário. Não reaproveitar senhas administrativas dos bancos como credenciais da aplicação. Os scopes novos e suas identidades ainda precisam de configuração antes do deploy.

Python publica uma imagem e um ConfigMap contendo seu digest para futura seleção pelo executor. O pipeline não aplica Job de treinamento nem reserva GPU. O treinamento real exige avaliação de CUDA, bibliotecas, dataset e memória na P7; build/testes CPU não certificam isso.

Os scripts de publicação mantêm a branch gitops exclusiva da aplicação. Não apontar infraestrutura compartilhada para essa branch. Rollback publica novamente o digest aprovado anterior.
