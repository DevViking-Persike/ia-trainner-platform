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
| `HEALTH_URL` | URL HTTPS de saúde: `/healthz` no frontend, `/api/healthz` na API |

`ZOT_USER` e `ZOT_PASSWORD` já existentes em `/zot` são obtidos pela action Infisical somente depois do build. Nenhum segredo é argumento Docker. Não copiar credenciais de runtime para GitHub Secrets. PRs nunca executam o job de publicação.

Criar identidade Infisical de leitura restrita a `/zot` e vinculá-la ao repository/environment/branch do workflow. Configurar issuer GitHub, audience e subject exatos. Repositórios novos ou renomeados podem usar subjects imutáveis com IDs: confirmar as claims efetivas, sem publicar o JWT. Não usar subject curinga. Referência: [OIDC na action Infisical](https://infisical.com/docs/integrations/cicd/githubactions).

## Frontend configurado

Domínio: `https://ia-trainner.victorpersike.dev.br`; saúde: `/healthz`. O bootstrap está em `infra-k8s/clusters/flex/apps/ia-trainner`, com DNS A/DNS-only para a borda flex1a e TLS pelo resolver Cloudflare existente. O workload é agendado no h6.

A identidade `github-ia-trainner-frontend` usa OIDC com subject imutável exato do repositório, environment `production`, ref `refs/heads/main` e audience do Infisical. O papel `ia-trainner-zot-reader` lê somente `dev /zot`. Não há credenciais persistentes em GitHub Secrets.

A chave GitHub de leitura do Argo fica em `/ia-trainner/gitops`, variável `FRONTEND_SSH_PRIVATE_KEY`; o operador materializa o Secret do repositório. Pull credentials usam `/zot`. A configuração de DNS lê `/cloudflare` em memória; nenhum token é enviado ao bundle ou à imagem.

## Backend configurado (M1)

A API é publicada na mesma origem: o Traefik envia `/api` ao Service `ia-trainner-backend` sem reescrever o caminho; o restante vai ao frontend. Saúde da API: `/api/healthz` (revisão própria, distinta do `/healthz` do frontend). O workload é agendado no h6, como o frontend.

A identidade `github-ia-trainner-backend` repete o padrão do frontend: OIDC com subject imutável exato do repositório do backend, environment `production`, ref `refs/heads/main`, audience do Infisical e papel `ia-trainner-zot-reader`. A chave de leitura do Argo fica em `/ia-trainner/gitops`, variável `BACKEND_SSH_PRIVATE_KEY`, cadastrada no GitHub como deploy key somente leitura.

A configuração da API vem do Infisical `dev /ia-trainner/backend` (issuer, audience = ID do projeto ZITADEL, endpoint/protocolo OTLP de traces e atributos de recurso), materializada pelo operador como Secret `ia-trainner-backend` e lida por `envFrom`. Nenhum desses valores é credencial; credenciais de adaptadores entram na mesma pasta quando existirem. Os identificadores públicos do SPA (authority, project ID, client ID) ficam registrados em `/ia-trainner/frontend` e compilados em `apps/frontend/src/app/core/config/auth-config.ts`; altere os dois juntos.

Frontend e backend estão com `DEPLOY_ENABLED=true`. Python permanece desativado. O Argo CD usa uma única Application `ia-trainner` multi-source (branches `gitops` do frontend e do backend), no AppProject restrito `ia-trainner`.

## Renomeação do executor Python — 26/09/2026

O repositório privado do executor passou a ser `DevViking-Persike/ia-trainner-finetuning-py`; o checkout permanece em `services/training-python`. O alias de DEV usa o novo nome, e o alias antigo continua apontando para o mesmo checkout para compatibilidade, sem duplicar dados. A Application, o AppProject e a URL da credencial Argo gerenciada pelo Infisical acompanham o novo nome. O GitHub passou a usar subject OIDC imutável após a renomeação; a confiança no Infisical foi ajustada para o prefixo exato retornado por `actions/oidc/customization/sub`, preservando as restrições de `main`, `production`, repository ID e owner ID.

## Bootstrap dos próximos componentes em infra-k8s

Antes de habilitar entrega, configurar namespace `ia-trainner`, pull secret `zot-creds` sincronizado do Infisical, rotas TLS, política de rede e Applications Argo CD com permissão de leitura dos repositórios privados. A API referencia o Secret `ia-trainner-backend`, sincronizado pelo operador a partir de `/ia-trainner/backend`. O principal não administra bancos, credenciais de infraestrutura ou RBAC global.

| Escopo proposto no Infisical | Variáveis |
|---|---|
| `/ia-trainner/backend` (criado) | `Authentication__Authority`, `Authentication__Audience`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`, `OTEL_RESOURCE_ATTRIBUTES`; credenciais das integrações quando seus adaptadores forem implementados |
| `/ia-trainner/frontend` (criado) | `ZITADEL_AUTHORITY`, `ZITADEL_PROJECT_ID`, `ZITADEL_CLIENT_ID` — registro dos identificadores públicos do SPA |
| `/ia-trainner/training` | `FINETUNING_DATABASE_URL`, credenciais restritas de artefatos, configuração de execução |
| `/embedding` existente | `sdk-gemini-1`, `sdk-gemini-2`; mapear para nomes aceitos pelo backend, sem renomear/destruir as chaves existentes |
| `/zot` existente | `ZOT_USER`, `ZOT_PASSWORD` |

No ZITADEL (`https://auth.victorpersike.dev.br`), o projeto **IA Trainner** (`392292462074267754`, separado do WebContador) retorna funções na autenticação e tem a função `user`. A aplicação `ia-trainner-web` é User Agent com Authorization Code + PKCE, sem client secret, access token JWT com funções e URIs exatas de callback/logout do domínio (client ID `392292695797663850`). A API aceita somente access tokens desse audience com a função `user` do projeto; conta autenticada sem a função recebe 403. A identidade OIDC de CI no Infisical é separada. Não reaproveitar senhas administrativas dos bancos como credenciais da aplicação; o M2 criará papéis próprios `ia-trainner-sql-ddl` (migrações) e `ia-trainner-sql-dml` (aplicação).

Python publica uma imagem e um ConfigMap contendo seu digest para futura seleção pelo executor. O pipeline não aplica Job de treinamento nem reserva GPU. O treinamento real exige avaliação de CUDA, bibliotecas, dataset e memória na P7; build/testes CPU não certificam isso.

Os scripts de publicação mantêm a branch gitops exclusiva da aplicação. Não apontar infraestrutura compartilhada para essa branch. Rollback publica novamente o digest aprovado anterior.

## Primeira publicação verificada — 25/09/2026

[GitHub Actions 36097976395](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36097976395) concluiu CI, publicação OIDC/Zot e verificação da release com sucesso. Argo CD `ia-trainner-frontend`: `Synced/Healthy`; pod `Running/Ready` no `h6`.

`https://ia-trainner.victorpersike.dev.br/healthz` retornou HTTP 200, `status=ok` e revisão `prod-3265b9268d6e27035f942309ec758c926fd63551-36097976395-1`. HTTP redireciona para HTTPS com 308; certificado público válido emitido por Let's Encrypt. A página Angular foi aberta no navegador sem erros de console.

Essas verificações cobrem a publicação da base Angular, não as integrações de negócio ainda pendentes.
