# Progresso de desenvolvimento por marcos

Registro mantido pelo workflow `/entregar-plataforma`. Estados: `pendente`, `em andamento`, `implementado`, `validado localmente`, `publicado`, `verificado no ambiente`, `bloqueado`. IDs abaixo são técnicos e públicos; nenhum token, segredo ou dado pessoal é registrado.

| Marco | Estado | Atualizado |
|---|---|---|
| M1 — acesso | em andamento (tela própria + BFF publicados e login verificado; faltam cadastro/recuperação com e-mail real e limpeza) | 25/09/2026 |
| M2 — documentos | em andamento (contratos e SQL reconciliados; integração local validada em PostgreSQL 17/18; infraestrutura aguarda autorização) | 25/09/2026 |
| M3 — conhecimento e conversas | pendente | — |
| M4 — treinamento | pendente | — |

## Decisões registradas para os próximos marcos

- Mudanças de banco (decisão do titular em 25/09/2026): esquema e dados do PostgreSQL ficam nos repositórios privados `ia-trainner-sql-ddl` e `ia-trainner-sql-dml`, submódulos em `database/` (criados em 25/09/2026). Flyway com SQL puro aplicado por Job PreSync do Argo; papéis `ia_trainner_migrator` (DDL e dados de referência) e `ia_trainner_app` (runtime, só DML), sem reaproveitar credenciais administrativas. Validadores/índices do MongoDB em `ia-trainner-sql-ddl/mongodb`; Redis sem repositório (usuário ACL próprio já criado).
- M2 (decisões do titular em 25/09/2026): uploads até 50 MiB de PDF, PNG, JPEG, WebP, TXT e MD (DOCX depois); envio de documentos ao Gemini permitido com aviso claro e consentimento registrado por usuário, P7 só como último recurso sem misturar índices; exclusão definitiva em cascata assíncrona (metadados, arquivo, trechos e vetores), citações antigas passam a indicar documento removido.
- Argo CD (decisão do titular em 25/09/2026): uma única Application multi-source `ia-trainner` no AppProject dedicado, com a branch `gitops` de cada componente como fonte.
- Tela de login (decisão do titular em 25/09/2026): a IA Trainner usa tela própria de login no seu domínio; a tela hospedada do ZITADEL não será usada. O M1 só conclui com essa tela publicada e verificada.
- Migração Svelte → Angular e refatoração dos componentes: paralelizar com Workflow e worktrees isoladas por pacote de trabalho, depois dos contratos acordados; inventário em execução.

## M1 — acesso

### Histórico da primeira entrega SPA — substituído pelo BFF

O contrato vigente está em [auth-bff](../architecture/auth-bff.md): tela própria → API BFF → cookie de sessão → `/app`. A seção abaixo preserva a evidência da implementação anterior; não deve orientar o M2.

Fluxo anterior: `Entrar` → ZITADEL (Authorization Code + PKCE, state e nonce) → `/auth/callback` → `/app` → API .NET com bearer token → contexto autorizado na tela.

| Contrato | Autenticação | Resposta |
|---|---|---|
| `GET /api/healthz` | pública | `200 {"status":"ok","revision":"..."}` — revisão da API, distinta de `/healthz` do frontend |
| `GET /api/me` | JWT ZITADEL + função `user` do projeto | `200 {"subject","organizationId","roles","expiresAt"}`, `Cache-Control: no-store` |
| `GET /api/platform` | JWT ZITADEL + função `user` do projeto | `200 {"capabilities":[{"id","status","milestone"}]}` — módulos indisponíveis explícitos |
| Token ausente, expirado, assinatura/algoritmo inválido, issuer ou audience errados | — | `401 application/problem+json` com `WWW-Authenticate: Bearer` |
| Conta autenticada sem a função `user` do projeto | — | `403 application/problem+json`, sem dados da conta |
| Rota `/api/*` desconhecida | — | `404 application/problem+json`; o nginx do frontend também responde JSON para `/api`, nunca o HTML da SPA |

Audience da API = ID do projeto ZITADEL "IA Trainner" (separado do WebContador). Funções lidas somente de `urn:zitadel:iam:org:project:{projeto}:roles`. Rotas da SPA: `/`, `/auth/callback`, `/app` (guard), `/acesso-negado`, `**` (não encontrada). A SPA guarda a sessão em `sessionStorage` da aba; token só vai para `/api/` da mesma origem.

### Implementado e validado localmente

- Frontend (`apps/frontend`): `oidc-client-ts` 3.5.0 (discovery, PKCE, state, nonce explícito), guard, interceptor, callback com cancelamento/erro, expiração (evento do token e 401 da API) com proteção contra loop, logout pelo end-session, retorno só para rotas privadas locais, CSP estrita e access log sem query/referer no nginx.
- Backend (`services/backend`): JwtBearer com issuer/audience/assinatura/validade e apenas algoritmos assimétricos, recusa de ID tokens, política `PlatformUser`, `/api/me`, `/api/platform`, `/api/healthz`, problem+json, exportação OTLP por sinal; configuração lida do Secret gerido pelo Infisical.
- `infra-k8s` (`clusters/flex/apps/ia-trainner`): rota `/api` → backend, NetworkPolicy/CiliumNetworkPolicy do backend, InfisicalSecrets da configuração da API e da chave de leitura do repositório, Application Argo única multi-source.

| Verificação local | Resultado |
|---|---|
| `dotnet test -c Release` (backend) | 30 aprovados: 23 da API (401 para ausente, expirado, chave desconhecida, HS256, sem assinatura, audience e issuer errados, malformado e ID token; 403 sem função e com função de outro projeto; contexto mínimo; 404 JSON; fechado sem configuração; recusa authority HTTP) + 7 de domínio |
| `npm test -- --watch=false` e `npm run build` (frontend) | 50 aprovados; bundle inicial 329 kB (87 kB transferidos) |
| Imagens locais com rootfs somente leitura | nginx: `/api` → 404 JSON, SPA → HTML, CSP e cache conferidos, log sem `code`/`state`; API: saúde 200, 401 problem+json, sem avisos |
| OTLP local | traces da API e da busca de discovery/JWKS chegaram a um Jaeger 1.62 local; `AddOtlpExporter` ignorava `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, corrigido |
| Gitleaks | commits dos três repositórios e bundle publicado sem vazamentos |

### Publicação

| Repositório | Commits | Actions | Revisão verificada |
|---|---|---|---|
| ia-trainner-frontend-angular | `d608753`, `51904fc` | [36108353429](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36108353429), [36109195071](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36109195071) | `prod-51904fc40c032cf2a395bc7b7b7ba933eb472599-36109195071-1` em `/healthz` |
| ia-trainner-backend-dotnet | `5b4c4e8`, `ef0b071`, `037b0ee` | [36107934124](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36107934124), [36108350028](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36108350028), [36108868631](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36108868631) | `prod-037b0ee094af1daf09f27fec4dc7556441bcf16b-36108868631-1` em `/api/healthz` |
| infra-k8s (privado) | `567b5e9`, `a7e5138`, `c79b4e0` | aplicado por `kubectl apply --server-side` | Application `ia-trainner` Synced/Healthy; pods no h6 |

Todos os runs concluíram `ci`, `publicar` e `verificar-deploy` com sucesso. Identidade de CI do backend: `github-ia-trainner-backend` (OIDC, subject imutável, `main`/`production`, leitura só de `/zot`). ZITADEL: projeto "IA Trainner" `392292462074267754`, função `user`, app `ia-trainner-web` (User Agent, PKCE, sem secret, access token JWT com funções) client `392292695797663850`. Infisical: `/ia-trainner/backend`, `/ia-trainner/frontend` e `BACKEND_SSH_PRIVATE_KEY` em `/ia-trainner/gitops`.

### Evidências no domínio

| Critério | Evidência |
|---|---|
| Entrar → ZITADEL → callback → área interna | Login interativo pelo botão Entrar com conta autorizada, ainda pela tela hospedada do ZITADEL; troca de código com PKCE, userinfo, `/api/me` e `/api/platform` 200 e contexto exibido |
| Rota privada sem sessão | `/app?aba=teste` foi ao ZITADEL e voltou à mesma rota com a query |
| Refresh da rota interna | recarga manteve a sessão da aba sem chamar o ZITADEL; API confirmou o contexto |
| Sessão expirada | sessão local vencida levou ao login e voltou à rota com token novo |
| Token recusado pela API | assinatura adulterada na sessão restaurada → 401 → um novo login, sem loop |
| Logout | end-session encerrou também a sessão SSO; Entrar voltou a pedir credenciais |
| API sem token / assinatura inválida / payload alterado | 401 problem+json com `WWW-Authenticate: Bearer` |
| Token ZITADEL válido sem a função do projeto | 403 sem dados da conta (ID token, antes da correção); após `037b0ee`, ID token → 401 |
| `/api` nunca cai no HTML da SPA | `/api/me` 401 JSON, `/api/nao-existe` 404 JSON; nginx também responde JSON para `/api` |
| Segredos | bundle só com IDs públicos; `client_secret` aparece apenas como nome de campo da biblioteca |
| OpenTelemetry | requisição com `traceparent` W3C encontrada no Jaeger do cluster (datasource do Grafana) com spans `GET /api/me` e `GET /api/platform`, `deployment.environment=production`; buscas de discovery/JWKS do pod com 200; logs JSON com TraceId e access logs no Loki |

### Tela própria de login (BFF) — em andamento

Contrato: [auth-bff](../architecture/auth-bff.md). Implementação em paralelo por Workflow (backend e frontend em worktrees e branches `codex/m1-bff-login` e `codex/m1-own-login`, com revisão adversarial). Provisionado e verificado:

| Recurso | Estado |
|---|---|
| ZITADEL: conta de serviço `ia-trainner-login` (`392298985206843498`) | só o papel de instância `IAM_LOGIN_CLIENT`; PAT válido até 25/09/2027, gravado direto no Infisical sem exibição; leitura de configurações testada |
| ZITADEL: app `ia-trainner-bff` (client `392299457619691626`) | Web, PKCE sem secret, callback `/api/auth/callback`, access token JWT com funções, perfil no ID token, Login V2 com URL base própria; `authorize` testado: `302` com `authRequest=V2_…` legível pela API de login |
| Configurações do ZITADEL lidas | senha: 8+ com maiúscula, minúscula, número e símbolo; 2FA não obrigatório; segundos fatores TOTP e U2F; autocadastro permitido; **sem SMTP na instância** |
| Redis compartilhado | usuário ACL `ia-trainner` (`~ia-trainner:*`, sem comandos perigosos), senha só no Infisical e hash no ConfigMap; reinício de ~23 s; `NOPERM` comprovado para outros prefixos, `KEYS`, `CONFIG` e `ACL` |
| Rede | Redis aceita só o pod da API; API com saída para Redis 6379 e SMTPS 465 |
| Infisical `/ia-trainner/backend` | chaves `Zitadel__*`, `Frontend__*`, `ConnectionStrings__Redis`, `Email__*` (Hostinger `smtp.hostinger.com:465`, remetente `contato@victorpersike.dev.br`); `Email__SmtpPassword` vazio até o titular preencher |

### Tela própria de login — publicada e verificada no domínio

| Repositório | Commits | Actions | Revisão |
|---|---|---|---|
| ia-trainner-backend-dotnet | `6d1834a`, `c6295d2` (BFF: Session/OIDC/User v2, cookie + Redis, CSRF, rate limit, respostas neutras em tempo) | [36122942298](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36122942298) | `prod-c6295d2a50cfccef4475943ca5947ef6bb97d681-36122942298-1` |
| ia-trainner-frontend-angular | `2dca1b4`, `7bb9a8b` (telas `/entrar` com TOTP, `/cadastro`, `/verificar-email`, `/recuperar-senha`, sem OIDC no navegador) | [36123405490](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36123405490) | `prod-7bb9a8bb8b5fbbc221a94cff4bdd8dc832218d08-36123405490-1` |

Testes: backend 167 (160 API + 7 domínio) e 17 mutações de segurança detectadas; frontend 186; revisão adversarial sem achados críticos/altos. Smoke local contra o ZITADEL real antes do deploy.

Evidências no domínio: `/app` sem sessão → `/entrar?returnUrl=…`; política de senha lida do ZITADEL pelo BFF; login inexistente → `401 invalid_credentials` em ~1,2 s (tempo constante); POST sem `X-IAT-Request` ou com `Origin` de outro subdomínio → `403 csrf`; login real do titular pela tela própria → `/app?aba=teste`, `/api/me` 200 pela sessão (função `user`, `no-store`), cookie de sessão invisível ao JavaScript, `sessionStorage`/`localStorage` vazios, **zero** chamadas do navegador a terceiros; chave de Data Protection gravada no Redis pela ACL; log "Login próprio ativo".

### Pendências

1. Conta de uso nova (não usar a admin do ZITADEL na plataforma): gerar senha forte e gravar login/senha no Infisical `dev /ia-trainner/acesso` (fora de qualquer Secret do cluster); o titular cria a conta em `/cadastro` com e-mail que lê; conceder a função `user` no projeto IA Trainner; depois remover `user` da conta admin.
2. Verificar no domínio: e-mail real de verificação (Hostinger) e link `/verificar-email`; conta sem função → `/acesso-negado`; recuperação de senha com e-mail real; logout encerrando sessão local e do ZITADEL; refresh de `/app`.
3. Desativar no ZITADEL o app antigo `ia-trainner-web` (client `392292695797663850`, PKCE no navegador); o app ativo é `ia-trainner-bff` (`392299457619691626`). Opcional: remover as chaves obsoletas de `/ia-trainner/frontend`.
4. Melhorias anotadas: exigir e-mail verificado no login (`email_not_verified`), cifrar o ticket da sessão no Redis com Data Protection, limpar chaves `oidc.*` antigas do navegador, verificar `forceMfa` por organização no ZITADEL real.
5. M2: contratos e SQL reconciliados (registro abaixo). Aguardar autorização para a infraestrutura preparada, depois continuar WP-M2-10…40. O inventário local contém critérios antigos de bearer/sessionStorage: prevalecem os contratos M2 e o BFF vigente.
6. Observado fora do escopo: CronJob `postgres-backup` falhando há 4 dias e `mongodb-exporter` em crashloop no cluster.


## Retomada em 25/09/2026 — aceitação M1 e base SQL M2

### M1: estado reconfirmado, aceitação humana pendente

A Application `ia-trainner` foi consultada e estava `Synced/Healthy`, frontend e API com 1/1 réplica no H6. `/healthz` e `/api/healthz` devolveram as revisões `7bb9a8b` e `c6295d2` da entrega BFF acima. Essa verificação de saúde não substitui cadastro, e-mail, login ou recuperação de senha.

Foi solicitado ao titular o e-mail da conta de uso. Ainda não foram geradas credenciais, criada conta, concedida/removida função ou desativado aplicativo nesta retomada. O M1 permanece **em andamento** até executar com o titular: cadastro e verificação → login sem função (`/acesso-negado`) → concessão de `user` → `/app`, refresh e logout → recuperação com senha nova → retirada da função da conta administrativa e desativação do app antigo. Não registrar dados pessoais nas evidências públicas.

### M2: reconciliação concluída localmente

Integradas as branches de contratos `worktree-wf_59df0d72-c93-9`/`codex/m2-contracts` com o estado BFF atual e os trabalhos `codex/m2-ddl-bootstrap`/`codex/m2-dml-bootstrap`. Correções adicionais:

- Bootstrap dedicado, repetível, com senhas pelo ambiente via `\getenv`; `PUBLIC` já perde acesso ao banco/schema `public` antes do Flyway. Arquivo incluído em `/flyway/bootstrap/infra-bootstrap.sql` na imagem DDL.
- Os três blocos SQL do contrato são idênticos byte a byte ao bootstrap e às migrações V0001/V0002. Verificação reproduzível: `python3 scripts/check-m2-sql-contract.py` (submódulo DDL presente) ou `--ddl-dir` com o checkout revisado. As migrações V0001/V0002 não foram reescritas nesta reconciliação.
- DML usa o Dockerfile real do DDL e seu bootstrap, ou a imagem DDL fixada por digest; preserva callbacks e `createSchemas=false`. Históricos protegidos inclusive quando a primeira migração de dados falha.
- Secret único dos migradores `ia-trainner-sql-ddl`; hooks DDL `-2`, DML `-1`. O teste sintético isolado exige opção explícita e nunca é registrado como integração real. A publicação DML exige `DDL_IMAGE` e integração real 17/18.
- Recursos Docker dos testes removidos ao terminar (contêineres, volumes anônimos, redes e tags de imagens próprias), sem limpeza global.

| Verificação executada | Resultado |
|---|---|
| DDL `scripts/verify.sh`, PostgreSQL 17.11 | passou; bootstrap repetido, migrações repetidas, catálogo, isolamento de donos, cascata, privilégios mínimos e guardas negativos |
| DDL `POSTGRES_IMAGE=postgres:18 bash scripts/verify.sh`, PostgreSQL 18.6 | passou; mesma suíte |
| DML `DDL_REPO_DIR=<DDL revisado> bash scripts/verify.sh`, PostgreSQL 17.11 | passou; imagem real/mesmo bootstrap, históricos, idempotência e rollback de scripts V/R sintéticos |
| DML com `POSTGRES_IMAGE=postgres:18` e mesmo DDL, PostgreSQL 18.6 | passou; mesma integração real |
| DML `ALLOW_SYNTHETIC_DDL=1 bash scripts/verify.sh` | passou; valida só o pipeline isolado usado no CI sem acesso ao DDL privado |
| `actionlint`, `bash -n`, `kubectl kustomize`, `git diff --check`, Gitleaks | passaram nos repositórios SQL; Gitleaks executado antes de cada tentativa de push |
| `python3 scripts/workspace.py check` e `check-m2-sql-contract.py` | passaram no principal |

### Publicação SQL

| Repositório | Revisão | GitHub Actions |
|---|---|---|
| [ia-trainner-sql-ddl](https://github.com/DevViking-Persike/ia-trainner-sql-ddl) | `83a3e13087b9da555b05f83e93bbd66260b51abc` | [36185937337](https://github.com/DevViking-Persike/ia-trainner-sql-ddl/actions/runs/36185937337) — sucesso (CI); publicação Zot desabilitada |
| [ia-trainner-sql-dml](https://github.com/DevViking-Persike/ia-trainner-sql-dml) | `15c31e9850eed1e8df6860a3fc67dbca274f6ca8` | [36185937510](https://github.com/DevViking-Persike/ia-trainner-sql-dml/actions/runs/36185937510) — sucesso (CI); publicação Zot desabilitada |

Os commits estão em `main` dos componentes. `DEPLOY_ENABLED` ainda não foi configurado nos dois repositórios: publicar o código não aplicou migrações nem publicou imagens no Zot. Nenhum Job SQL foi executado contra o PostgreSQL compartilhado nesta retomada.

### Infraestrutura M2 preparada, não aplicada

No repositório privado `infra-k8s`, branch local `codex/ia-trainner-m2-preparation`, commit `19f508a`, o arquivo `clusters/flex/apps/ia-trainner/M2-approval.md` descreve recursos, ordem, pré-condições e reversão. Inclui Jobs dedicados de PostgreSQL/Kafka, Secrets separados para migradores/Worker, fontes e permissões Argo, políticas de rede e políticas JSON de bucket/credenciais/lifecycle RustFS. O Job compartilhado `init-databases` e os arquivos não rastreados preexistentes foram preservados.

`kubectl apply --server-side --dry-run=server` aprovou os manifests de apps, os Jobs dedicados e a Application proposta. Foi apenas simulação; não comprova conectividade, execução ou suporte RustFS a todas as operações. A autorização explícita do titular foi solicitada antes de qualquer aplicação, conforme a instrução desta retomada.

Próximas ações: obter a resposta sobre o e-mail da conta de uso e executar a aceitação M1 com o titular; após autorização da proposta M2, provisionar seus pré-requisitos, publicar a imagem DDL e fixar seu digest no DML/backend. Depois implementar WP-M2-10…40, preservando a separação de segredos API/Worker e o consentimento Gemini. Nenhuma capacidade de documentos foi habilitada na plataforma nesta etapa.


## Execução M2 em paralelo — 25/09/2026

O titular confirmou que entra e faz login sem problemas e solicitou avançar ao M2 com subagentes GPT-6/Terra. Essa orientação autorizou executar a proposta de infraestrutura concreta preparada acima. Não equivale à verificação dos outros fluxos M1 ainda pendentes. Foram usadas três frentes: API/persistência e Worker/OCR em GPT-6, Angular em Terra, com integração e publicação pelo agente principal.

### Infraestrutura autorizada e aplicada parcialmente

- `infra-k8s` publicado em `ec06ceb`, preservando a alteração concorrente de Redis e os arquivos não rastreados. Jobs dedicados PostgreSQL/Kafka concluídos; banco `ia_trainner`, papéis sem atributos administrativos e tópicos próprios criados. Backup PostgreSQL bem-sucedido em 25/09/2026 20:14 UTC. Nenhum restart de Redis/PostgreSQL nesta execução.
- RustFS: bucket privado `ia-trainner-documents`, identidade de aplicação própria e policy somente `documents/`; put/get/list/delete sintéticos passaram. Acesso a outro bucket e listagem anônima recusados (403). Lifecycle de multipart em 1 dia confirmado; versionamento e object lock ausentes.
- Configurações apenas no Infisical: backend PG/S3; Worker com 17 referências/chaves próprias, sem Redis/ZITADEL/SMTP; migrador em Secret próprio. Chaves GitOps somente leitura dos repositórios SQL sincronizadas. AppProject/rede aplicados; fontes SQL da Application ainda aguardam DML publicado.
- DDL publicado pelo [Actions 36212630319](https://github.com/DevViking-Persike/ia-trainner-sql-ddl/actions/runs/36212630319), digest `sha256:4fb05d11eb03773148e63a6a67827ed418e99e58c9f60bcce350a51aee0f1c0f`. DML habilitado com esse digest e [Actions 36212914283](https://github.com/DevViking-Persike/ia-trainner-sql-dml/actions/runs/36212914283) em execução neste checkpoint.
- `gemini-3.8-flash` confirmado pela API com ambas as chaves e pela documentação oficial. Faturamento de `sdk-gemini-1/2` ainda pendente do titular para liberar o aviso/fluxo OCR; não afirmar plano pago. Nenhum documento pessoal enviado.

### Implementação em integração (não publicada ainda)

- Angular: commits `64df0b6`, `274f9d0`, 199 testes e build aprovados; documentos/coleções, consentimento, upload/progresso, polling, detalhe/download/retry/delete e shell responsivo.
- API: fundação `f335607`, adaptadores `34b433e`; endpoints e testes reais em finalização. Uma primeira integração local PostgreSQL17/RustFS passou com as migrações canônicas; ampliar cobertura antes de publicar.
- Worker: `cb4a318`, 9 testes sintéticos e build aprovados; outbox/inbox, extração/OCR com consentimento antes de cada chamada, retries, recuperação e exclusão. Verificação Kafka real ainda em andamento.
- Integração backend em `codex/m2-integration`; manifests do Worker no H6 e gate de integração PostgreSQL/S3 contra DDL publicado em preparação.

Próxima ação: concluir testes/integração, acompanhar publicação DML e aplicar fontes PreSync, resolver confirmação do nível Gemini, publicar backend/Angular, verificar o fluxo no domínio e persistência/isolamento/traces. M2 permanece **em andamento**; M1 publicado permanece funcionando.

### Infraestrutura M2 validada no cluster

DDL e DML publicados com sucesso pelos Actions `36212630319` e `36212914283`; o segundo executou integração real em PostgreSQL17/18 usando o digest DDL. DML: `sha256:d36c844a2d1550ff0e6526e04623e010f604ee37b394e2ebdd2667b8080ff653`. Application agora tem quatro fontes; sync completo executou hooks DDL e DML `Succeeded`, Argo `Synced/Healthy`. Catálogo no PostgreSQL18.4 confirmou as tabelas canônicas, V0001/V0002 bem-sucedidas e propriedade pelo migrador. Jobs próprios de bootstrap removidos após evidências. Secrets do cluster comparados em memória: referências PG/S3 expandidas e iguais, credenciais M1 ausentes do Worker, credenciais do migrador exclusivas. API/frontend M1 seguem saudáveis sem novo rollout.

## Integração M2 revisada — 26/09/2026

| Componente | Candidato publicado | Validação |
|---|---|---|
| Frontend | `6255dd8`, [PR #1 em rascunho](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/pull/1) | 203 testes e build; smoke local desktop/375 px; [Actions 36213360234](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36213360234) CI aprovado |
| Backend/API/Worker | `63566ca`, [PR #1 em rascunho](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/pull/1) | restore bloqueado, 9 Domain + 164 API + 18 Worker aprovados; dois gates opcionais executados separadamente abaixo; publish Worker/actionlint/kustomize aprovados; [Actions 36213888988](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36213888988) CI aprovado, incluindo construção Linux |
| Infra | `9cf60bd` em main de infra-k8s | quatro fontes Argo, hooks DDL/DML Succeeded, Synced/Healthy; banco/tópicos/bucket/Secrets e isolamento verificados |

A integração adicionou casos de uso Application e testes de fronteiras da arquitetura, remoção das portas sem filtro de dono do container DI da API, validação multipart real, proteção de consentimento durante upload e cada chamada HTTP Gemini, guardas contra mensagens Kafka sem headers e correções de concorrência. O frontend cobre cursor, deep links de páginas, capacidades indisponíveis e erros 503 sem polling infinito.

### Testes reais adicionais

- `M2_SQL_DIR=<postgresql canônico> dotnet test -c Release`: PostgreSQL17/RustFS descartáveis, upload/extração TXT até ready, inbox persistente e ausência de novo processamento após recriar o handler, evento com dono incorreto sem marcar inbox, isolamento de lista/detalhe/página/download/retry/delete, duplicidade concorrente, exclusão do objeto e cascata real SQL, exclusão de coleção em corrida com upload. Sem envio ao Gemini nesse teste.
- `PG_TEST_PORT=25433 KAFKA_TEST_PORT=29093 bash tests/IATrainner.Worker.Tests/run-kafka-integration.sh`: broker e PostgreSQL descartáveis, relay real, ack da outbox, consumo, duplicação, mensagem inválida e cinco falhas do handler encaminhadas à DLQ. Nesse gate de transporte o handler usa estado sintético; a durabilidade do handler é coberta pelo teste SQL/S3 anterior. Recursos próprios removidos.
- `GEMINI_INTEGRATION=1`, apenas chaves/modelo injetados em memória pelo Infisical: SDK oficial com `gemini-3.8-flash` transcreveu PNG e PDF digitalizado sintéticos; PDF com camada textual extraído localmente. Teste aprovado (27 s). Nenhum documento pessoal, conta humana ou consentimento real de usuário criado. O gate não é executado automaticamente pelo CI.
- Execução sem serviços externos apresenta os testes opcionais como ignorados, sem sucesso silencioso. Pipeline de publicação exige imagem DDL fixa por digest e os gates PostgreSQL/S3 e Kafka antes de publicar Zot/GitOps.

### Pendência exata para publicar e verificar M2

O titular ainda precisa confirmar se as duas chaves `/embedding` são pagas ou se alguma usa o nível gratuito, conforme `docs/contracts/m2/consentimento-gemini.md`. O aviso no código usa a variante conservadora; não foi apresentado em produção. Essa resposta define o texto final antes do merge/deploy. Os PRs foram deixados em rascunho e os gitlinks da composição permanecem nas versões estáveis publicadas.

Após a resposta: fixar a variante correta do aviso `gemini-v1` (ainda sem aceites em produção), concluir CI/revisão, integrar backend/Angular pelo pipeline, conferir digest e Worker Ready na H6, validar upload/estado/páginas/retry/exclusão na sessão do titular e traces até o coletor. API/frontend M1 continuam nas revisões c6295d2/7bb9a8b, confirmadas por HTTPS após a aplicação da infraestrutura. M2 está **validado localmente e aguardando a confirmação do aviso para publicação**, não verificado no ambiente de uso.

Checks finais: CI dos dois PRs aprovado; composição `7f62c10` aprovada no [Actions 36213936227](https://github.com/DevViking-Persike/ia-trainner-platform/actions/runs/36213936227). Publicação dos componentes foi corretamente ignorada em pull_request. Os worktrees dos candidatos estão limpos; alterações do legado e worktrees de terceiros permanecem preservados. O túnel SSH temporário do teste S3 foi encerrado.
