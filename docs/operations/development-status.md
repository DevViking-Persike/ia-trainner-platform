# Progresso de desenvolvimento por marcos

Registro mantido pelo workflow `/entregar-plataforma`. Estados: `pendente`, `em andamento`, `implementado`, `validado localmente`, `publicado`, `verificado no ambiente`, `bloqueado`. IDs abaixo são técnicos e públicos; nenhum token, segredo ou dado pessoal é registrado.

| Marco | Estado | Atualizado |
|---|---|---|
| M1 — acesso | em andamento (tela própria + BFF publicados e login verificado; faltam cadastro/recuperação com e-mail real e limpeza) | 25/09/2026 |
| M2 — documentos | implementado e validado localmente; infraestrutura aplicada, recurso desativado aguardando confirmação do aviso Gemini | 26/09/2026 |
| M3 — conhecimento e conversas | em andamento; histórico MongoDB verificado no ambiente, RAG pendente | 26/09/2026 |
| M4 — treinamento | em andamento; runtime validado em CPU, integração Kubernetes/GPU pendente | 26/09/2026 |

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

## Frontend de testes e chat local — 26/09/2026

Pedido do titular: disponibilizar frontend para testar funcionalidades reais e conferir exposição de segredos nos repositórios. Também foi perguntado se todo o Svelte já havia sido migrado. A migração permanece parcial: as telas antigas combinam IPC do Tauri e repositórios simulados; não representam uma API web funcional equivalente. O inventário e as limitações atuais estão em [chat-lab](chat-lab.md).

### Publicado e verificado no ambiente

- Frontend `cb3eb6997a73ad03d7ff869f05f294bf40db10b1`, [PR #1 integrado](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/pull/1), [Actions 36218844834](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36218844834) concluído. Revisão HTTPS `prod-cb3eb6997a73ad03d7ff869f05f294bf40db10b1-36218844834-1`; digest `sha256:5f02d3ca702c2be804d9e61a784b9aec7d9039243028b43aefcf7ad119c9ead4`.
- Backend/API/Worker `c693b39c399eeb3e4449633af8c55f389bbd01e1`, [PR #1 integrado](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/pull/1), [Actions 36218776137](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36218776137) concluído. Revisão HTTPS `prod-c693b39c399eeb3e4449633af8c55f389bbd01e1-36218776137-1`; digest `sha256:17681c01e40372068746ccdfdd78cb15b6014b016b0cab01371611a5ce614205`.
- Infra `d61b821` adiciona somente a saída da API para o serviço interno Ollama na porta 11434. Configuração do chat no Infisical, sem chaves Gemini na API. Argo `Synced/Healthy`, operação `Succeeded`; frontend, API e Worker `Ready` na H6, sem reinícios. Inferência continua na P7.
- No domínio oficial e na sessão existente do titular: painel → Testar chat → catálogo real `qwen3.5:9b` → resposta a mensagem sintética → segunda resposta mantendo contexto. Cancelamento removeu o turno pendente e um novo envio funcionou. Recarregar a rota preservou a sessão e limpou a conversa, conforme o contrato temporário. Nenhum documento pessoal foi enviado.
- Interface conferida em desktop e 375 px, sem rolagem horizontal; abrir/fechar navegação móvel passou e o viewport foi restaurado. Acesso anônimo ao catálogo retorna 401 `application/problem+json`, sem fallback da SPA.
- Jaeger recebeu os traces de `POST /api/chat/test` com os spans HTTP do catálogo e da geração no provedor, incluindo chamadas 200 e a chamada cancelada. O conteúdo sintético do chat não apareceu na amostra dos logs da API após a publicação.

### Validação e revisão

Frontend: 224 testes e build de produção aprovados. Backend: restore bloqueado, 9 Domain + 193 API + 18 Worker aprovados; dois gates externos explicitamente ignorados nessa execução padrão. A suíte API incluiu PostgreSQL/S3 reais usando o DDL canônico. O pipeline de publicação repetiu os gates PostgreSQL/S3 e Kafka com sucesso. Gitleaks passou nos commits destinados aos remotos e no bundle Angular. A revisão paralela corrigiu configuração ausente do chat, limite de resposta compatível com o próximo turno, concorrência por instância e estados de cancelamento, erro, retry e seleção de modelo no frontend.

Auditoria de todos os refs publicados: principal público e componentes ativos privados sem detecções; histórico privado de infraestrutura e legados tem achados que exigem triagem/rotação conforme vigência. O relatório detalhado foi mantido fora do Git público, sem valores secretos. Esta verificação não certifica logs/artefatos antigos, imagens OCI, validade de credenciais ou históricos anteriores de visibilidade.

### Limites e próxima ação

O laboratório **não é o M3 completo**: sem RAG, documentos, fontes ou histórico persistente. O treinamento **não está entregue**: falta executor Kubernetes e validação da imagem Python/GPU. Gestão completa de modelos, equipes e monitoramento de servidor também permanecem fora da migração concluída.

O código M2 agora está publicado, mas `Documents__Enabled=false` mantém seus endpoints e consentimento indisponíveis. A informação sobre faturamento das duas chaves Gemini continua pendente; nenhum aceite da variante provisória foi solicitado no ambiente. Após a resposta do titular, finalizar o aviso, ativar M2 pelo Infisical e validar upload/processamento/páginas/exclusão no domínio. Não registrar documentos como verificados no ambiente enquanto essa etapa não ocorrer.


## Conversas MongoDB e contexto — 26/09/2026 (verificado no ambiente)

A versão anterior do laboratório mantinha mensagens somente na memória do Angular. A implementação nova usa MongoDB para histórico por usuário e separa o armazenamento da seleção de contexto do Ollama.

- Backend: branch `codex/chat-persistence`, implementação `b3c99fe`, merge `ea87fc4`; PR [2](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/pull/2). 230 testes aprovados, 3 opt-in ignorados; integração real MongoDB 8 com o schema canônico, isolamento, role CRUD restrita, idempotência/CAS, Unicode, falha sem mensagens parciais, leitura após nova instância da API e exclusão.
- Frontend: branch `codex/chat-persistence`, commits `71d6963`, `20ae58a`, `c199fdb`, merge `47ae4c8`; PR [2](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/pull/2). 224 testes e build aprovados. Histórico, URL selecionada, cancelamento/reconciliação, leitura sem provedor, contexto/uso de tokens e navegação unificada.
- DDL: merge `bffb973`; PR [1](https://github.com/DevViking-Persike/ia-trainner-sql-ddl/pull/1), CI/release [36222076206](https://github.com/DevViking-Persike/ia-trainner-sql-ddl/actions/runs/36222076206) concluída. Validador e índice da coleção `ia_trainner.conversations`; testes MongoDB 8 e suites PostgreSQL 17/18 aprovados. Schema aplicado no cluster antes da ativação, sem registros artificiais.
- Infra: merge `2c4be0e`; PR [7](https://github.com/DevViking-Persike/infra-k8s/pull/7). Identidade exclusiva `ia_trainner_chat`, CRUD somente em `ia_trainner.conversations`, políticas de rede API→MongoDB aplicadas. Configuração de conexão somente no Infisical `/ia-trainner/backend`, sincronizada pelo operador; Worker/Angular não recebem a conexão.
- Contexto P7: 8k com 3.773 tokens de entrada em 5,57s/pico 6.631 MiB; 16k com 7.613 tokens em 8,56s/6.903 MiB; 32k com 15.317 tokens em 13,47s/7.447 MiB. Teste adicional de 32k: 27.745 tokens de entrada e 763 de saída, 25,5s, pico 7.447 MiB e marcador inicial recuperado. Todos inteiramente na GPU. Infisical configurado para contexto 32.768 e saída 1.024.
- Gitleaks: novos commits de backend/frontend/DDL/infra e bundle Angular sem achados. Isso não substitui o relatório de auditoria histórica anterior.

### Publicação e aceitação real

- Backend: [Actions 36222273732](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36222273732) concluído; `/api/healthz` confirmou `prod-ea87fc4fe406edb703a180f47c82ac50c9afcbb8-36222273732-1`. API/Worker Ready na H6, digest `sha256:fad1939aeae70899ae4e4e83bfeaeee913a9b48f3556828200d6ec0724cca967`.
- Frontend: [Actions 36222749701](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36222749701) concluído; `/healthz` confirmou `prod-47ae4c8889d2729dfc24615cda7848d75d66ffbf-36222749701-1`. Pod Ready na H6, digest `sha256:46cb1293c967c91d5f93ed739c88318ca3c099f706fc3253d8dd854de75f9ef5`.
- Argo `Synced/Healthy`; revisões frontend `cc74f4546c909aaa938f4305a60ecaa36c1a84d0`, backend `d583af6285842b0d5e3afd10cbe790a4ab458b91`, DDL `37aeb5f656518dc182083ede412c9677acb8af4c` e DML `b3acca36c1a2f61e9e7602257f0d1b17c21a50f6`. Hooks SQL concluídos.
- Domínio oficial: criação pela interface, pergunta/resposta sintéticas, recarga da página com recuperação das duas mensagens e segunda pergunta com memória do marcador. MongoDB consultado diretamente confirmou proprietário presente, versão 2, quatro mensagens e consumo da última resposta: 73 tokens de entrada, 3 de saída, contexto 32.768/saída máxima 1.024. Nenhum documento foi inserido manualmente para simular o fluxo.
- OpenTelemetry: trace `333fddf32098b4d1f14899ffea450e16` encontrado no Jaeger do cluster, com request de mensagem, Ollama 200 e spans MongoDB find/update sem erros. Logs da API não continham a pergunta sintética nem URI MongoDB.
- Acesso anônimo à API de conversas retorna 401 JSON. Isolamento entre usuários, exclusão, repetição e falhas foram verificados nos testes de integração; exclusão não foi executada na conversa de validação em produção.
- Gitlinks da composição atualizados para frontend `47ae4c8`, backend `ea87fc4` e DDL `bffb973`. Mensagens da aba antiga continuam temporárias e não foram migradas; a aba foi preservada. A conversa nova permanece como evidência de validação.

### Próximas etapas preparadas

M2 continua desativado (`Documents__Enabled=false`) aguardando confirmação do nível de faturamento das duas chaves Gemini para definir o aviso conforme [contrato de consentimento](../contracts/m2/consentimento-gemini.md). Nenhum documento pessoal foi enviado ao Google.

M3: adaptadores Gemini/Qdrant no [PR backend #3 em rascunho](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/pull/3), commits `58ea3d6` e `9e0240f`; [Actions 36223044602](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36223044602) aprovado, publicação ignorada por ser PR. 238 testes passaram e 5 integrações opt-in foram ignoradas na suíte normal; duas chamadas reais adicionais, exclusivamente sintéticas, passaram com as chaves injetadas pelo Infisical. Perfil `gemini-embedding-001-768-l2-v1`, vetores finitos e normalizados. Chunking, portas e adaptadores preparados; DI, indexação durável/outbox, recuperação, consentimento persistido e citações ainda não conectados. Não habilitar RAG antes de concluir esse fluxo.

M4: runtime Python no [PR #1 em rascunho](https://github.com/DevViking-Persike/estudos-finetuning-py/pull/1), branch `codex/training-runtime-validation`, commits `150a691` e `30e98cd`; imagem Linux amd64 construída, 58 testes rápidos aprovados e 1 integrado opt-in executado separadamente na imagem. Roundtrip CPU real com checkpoint minúsculo sintético: treino de um passo, gravação de adapter PEFT, reabertura em eval e geração limitada em arquivo 0600. Checkpoint Qwen/P7, janela exclusiva de GPU, executor Kubernetes durável, recuperação, avaliação e exportação GGUF/Ollama permanecem pendentes. Não ativar deploy/treinamento com base apenas nesse teste CPU. A revisão registrou requisitos antes da integração: exigir orçamento de passos no executor (a CLI o mantém opt-in), limitar registros/bytes/campos antes do carregamento integral em memória e montar artefatos privados graváveis pelo UID 10001; o caminho `/artifacts` do exemplo exige esse volume, enquanto a imagem fornece `/opt/finetuning/artifacts`.

Próxima ação dependente de informação: confirmar se ambas as chaves Gemini têm faturamento ativo; então finalizar aviso/consentimento, habilitar e verificar M2 no domínio. M3 e M4 permanecem em andamento, sem declaração de conclusão.

Composição da entrega MongoDB: `d219aed`, [Actions 36223509516](https://github.com/DevViking-Persike/ia-trainner-platform/actions/runs/36223509516) aprovado. O gitlink Python continua em `68655e9`; os PRs de preparação M3/M4 não foram integrados nem implantados.

## Rotas do frontend e disponibilidade do Perfil — 26/09/2026

A inspeção da aba do titular encontrou o bundle anterior ainda em execução: menu “Testar chat”, “Conversas” indisponível e limite de 4.000 caracteres. A aba estava sem mensagens; recarregá-la trouxe a versão `47ae4c8`, a navegação unificada “Conversas”, o contexto 32.768 e a conversa sintética salva no MongoDB. O Painel foi aberto pela navegação e carregou normalmente.

O estado dos outros itens é distinto: Documentos tem rotas/componentes publicados, mas `Documents__Enabled=false` mantém sua capacidade indisponível; Treinamentos e Modelos são itens previstos no menu e ainda não têm rotas/componentes ativos. Não habilitar esses links antes de implementar os respectivos fluxos.

Foi reproduzido um defeito independente em `/app/perfil`: a resposta 503 do consentimento Gemini, causada por Documentos desativado, escondia a conta inteira. A correção `55a550f` separa o carregamento da conta e do consentimento; indisponibilidade e retry ficam restritos à seção Gemini, preservando conta, saída da sessão e link de redefinição de senha. [PR frontend #3](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/pull/3).

Validação: 228 testes e build aprovados; regressões de consentimento lento/503, conta acessível, saída, retry isolado, falha da conta e revogação. Gitleaks do commit e bundle sem achados. CI do [PR 36224320101](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36224320101) e [release 36224410315](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36224410315) concluídos com sucesso.

Merge `9dc44b6cb4fbb8ba2e3eec0b9ae20596770779eb`; `/healthz` confirmou `prod-9dc44b6cb4fbb8ba2e3eec0b9ae20596770779eb-36224410315-1`. Argo `Synced/Healthy`, GitOps frontend `bc51e6b0906982c465ab5f25c101682e6b42c280`, pod Ready na H6 e imagem `sha256:493487de4902ae418c7a254247fe5620a5a2940cbfdd2266a1421f0c15b21c58`. Gitlink atualizado na composição.

No domínio oficial, a sessão existente carregou Conta e ações do Perfil com Documentos ainda desativado. O aviso de consentimento ficou restrito à seção Gemini; repetir essa consulta manteve a conta visível. Nenhum aceite foi registrado, nenhum documento foi enviado e nenhuma função M2/M4 foi habilitada por essa correção. O estado das chaves Gemini continua pendente para finalizar o aviso e liberar Documentos.


## Documentos, treinamentos e modelos — 26/09/2026

Esta entrega publica M2 e M4 para validação controlada. Não declara concluído o aceite ponta a ponta: o upload/OCR na sessão do titular e o treino/avaliação GPU ainda dependem das confirmações descritas abaixo. M3 RAG permanece separado.

### Componentes publicados

| Componente | Main e publicação | Evidência |
|---|---|---|
| Angular | `55863b52ad5ea5a965c108638b410e9ece7896e5`, [PR #5](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/pull/5), [Actions 36228165834](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36228165834) | 242 testes, build, scanner do commit e bundle; verificação de deploy aprovada. Telas de datasets/agendamento/histórico, versões, download e comparação base/adapter; polling de todas as fases, cancelamento e idempotência vinculada ao payload. |
| API/Worker .NET | `6494fe5069d07854e5a90451d8236cb74fa37ba4`, [PR #5](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/pull/5), [Actions 36228849089](https://github.com/DevViking-Persike/ia-trainner-backend-dotnet/actions/runs/36228849089) | API 217, Domain 9 e Worker 18 testes locais, build sem avisos. Gate de publicação com DDL V0004 publicado: três integrações PostgreSQL/S3 e uma Kafka aprovadas. Release e smoke HTTPS aprovados; imagem `sha256:7be96122c81e51b4a573314e7305bf4b0254fa0adc980cf129d0c60f8ce9cbf1`. |
| Python | `55219d5d39fc090edd9379401ab5bdd238d2a360`, [PR #2](https://github.com/DevViking-Persike/estudos-finetuning-py/pull/2), [Actions 36227966607](https://github.com/DevViking-Persike/estudos-finetuning-py/actions/runs/36227966607) | 90 testes rápidos e um teste CPU opt-in executado separadamente na imagem. Linux amd64, runtime por manifesto v1, limites de dados/passos/contexto, S3/hash/tamanho, avaliação base+adapter e resultado gravado por último. Digest `sha256:ed76cac9e856b6db1632d7a458092d7ff710d6d6ec1224450a4b9256665c69c0` confirmado no ConfigMap do cluster. |
| PostgreSQL DDL | `7128b4c8d4a177d84d6b5b577d02208c72930d7f`, [PR #2](https://github.com/DevViking-Persike/ia-trainner-sql-ddl/pull/2), [Actions 36227597150](https://github.com/DevViking-Persike/ia-trainner-sql-ddl/actions/runs/36227597150) | PG17.11/18.6: dois proprietários e 18 rejeições específicas, incluindo sete FKs de dono, janela, orçamento, idempotência, seleção e GPU. V0001/V0002/V0004 confirmadas bem-sucedidas em produção. Imagem `sha256:1e840bb72adc4a69b5280f612dfbb8974a1c7a7a2acc5ac40752f810fbb7536e`. |
| infra-k8s | `6057b78f13e5fd6092f25072cdce4505573afba6`, [PR #8](https://github.com/DevViking-Persike/infra-k8s/pull/8) e [PR #9](https://github.com/DevViking-Persike/infra-k8s/pull/9) | Application com cinco fontes; bootstrap de armazenamento, identidade runtime, Kafka, PVC, RBAC, admission e rede aplicado. |

### Configuração e verificações operacionais

- Documentos habilitado com `Documents__Enabled=true`. O aviso conservador `gemini-v1` informa possível nível gratuito do Gemini, melhoria de modelos/revisão humana e proíbe conteúdo pessoal, sensível ou confidencial. Zero aceites foram confirmados antes de revisar o texto. A sessão do titular mostrou coleções, lista vazia e aviso, sem aceitar nem enviar arquivos.
- `Training__Enabled=true` na API e no Worker, `TrainingWorker__Enabled=true` no Worker, sempre pelo Infisical. A fila foi consultada antes da ativação e continha zero trabalhos. A publicação de imagem/ConfigMap não cria Jobs. Secrets sincronizados e API/Worker reiniciados explicitamente; readiness M4 verifica PostgreSQL, Kafka e leitura do ConfigMap por credencial Kubernetes restrita.
- No domínio oficial, a sessão existente abriu as três rotas e os links ficaram ativos. Treinamentos carregou catálogo Qwen/LoRA, limites e janela mínima de 80 minutos, com datasets/histórico vazios; Modelos mostrou ausência de adapters e explicou a avaliação por Job. Nenhum dado simulado foi apresentado como resultado. Catálogo, datasets, trabalhos e versões retornaram 401 Problem Details em acesso anônimo. HTTPS confirmou as revisões Angular `prod-55863b52ad5ea5a965c108638b410e9ece7896e5-36228165834-1` e API `prod-6494fe5069d07854e5a90451d8236cb74fa37ba4-36228849089-1`.
- API/Angular/Worker na H6; somente Jobs Python usam a GPU P7. O reconciliador persiste a escala original do Ollama antes da pausa e serializa efeitos externos com advisory lock PostgreSQL. Testes cobrem reinício após drain, lease expirado, cancelamento, concorrência, resultado/artefato e readiness de restauração atrasada. Kubernetes foi simulado nesses testes; não representam prova de GPU real.
- Buckets privados `ia-trainner-datasets`/`ia-trainner-artifacts`; identidade do Job lê datasets e lê/escreve somente artefatos de execução. Testes S3 reais de acesso permitido/negado passaram e removeram as próprias fixtures. O Job não recebe credenciais PostgreSQL, Gemini ou ZITADEL.
- Admission testada com dry-run no servidor usando a identidade do Worker: template restrito aceito; Secret alheio, privilégio, imagem livre, token, outro PVC/nó e referência de segredo por env rejeitados pela política. RBAC não lê Secrets nem altera outros Deployments. Nenhum Job GPU criado pelo dry-run. PVC de cache aguarda o primeiro consumidor, conforme `WaitForFirstConsumer`.
- Python publica por OIDC do GitHub vinculado a `main`, `production`, repository ID e owner ID, com leitura somente de `/zot`. Deploy key GitOps somente leitura. Segredos ficaram no Infisical; scans das alterações/bundle sem achados. Repositório de composição público; componentes mantidos privados.
- OpenTelemetry configurado e propagação W3C .NET→manifesto→Python coberta nos testes. O endpoint Python usa o serviço Jaeger existente. Trace real de treinamento permanece pendente até o primeiro Job; não foi afirmada observabilidade GPU ponta a ponta.

### Uso e limites do aceite

O [guia de treinamento](testar-treinamento.md) inclui um [JSONL sintético](../../examples/training/synthetic-smoke.jsonl). O candidato inicial é `Qwen/Qwen2.5-0.5B-Instruct`, LoRA, 1–100 passos e até 1.024 tokens por exemplo formatado. Janelas iniciais mínimas: 80 minutos para treino e 30 para avaliação, incluindo preparação e recuperação; conclusão antecipada inicia restauração. Esses testes não demonstram ganho de qualidade.

Documentos não gera dataset automaticamente. Selecionar uma versão preserva a preferência para avaliação por Job; não converte o adapter PEFT em GGUF nem o instala no chat Ollama. Exportação/instalação no Ollama e M3 RAG não foram incluídos nesta entrega.

Pendências explícitas: autorização do titular para aceitar o aviso e enviar/remover apenas arquivos sintéticos na sessão de produção; janela autorizada para pausar o chat e executar treino/avaliação reais na P7, verificar artefato, duplicação/reinício/cancelamento, restauração da inferência e traces no coletor. Nenhum aceite de Gemini foi gravado pelo agente e nenhum Job de GPU foi iniciado. O teste CPU e o dry-run Kubernetes não substituem esse aceite.

## Calendários e chat com rota própria — 26/09/2026

- Treinamentos: início/fim possuem botões acessíveis de calendário em linhas completas, com seleção nativa de data/hora e edição por teclado preservada. [PR Angular #6](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/pull/6), merge `5d25341dff1554302f6f543ab5147424b5e4de5d`, [Actions 36249526670](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36249526670) aprovado até a verificação do deploy. Ambos os botões abriram os seletores no navegador do domínio oficial; nenhum agendamento foi enviado.
- Chat: [PR Angular #7](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/pull/7), commit `f91b8bc`. `/app/chat/nova` abre o editor e o primeiro envio cria o registro, navegando para `/app/chat/:id`. Links antigos com `?conversation=…` e `/app/conversas` continuam válidos. A navegação anterior/próxima do navegador funciona com a mesma instância da página.
- Disposição inspirada no deepseek-harness, preservando cores e navegação da plataforma: histórico recolhível, pesquisa por título no histórico carregado, coluna central de mensagens e editor inferior. Markdown, tabelas, código, cópia da resposta, Enter/Shift+Enter, rascunhos por conversa e rolagem para mensagens recentes. A pesquisa não consulta o conteúdo das mensagens nem páginas de histórico não carregadas.
- Segurança e estado: HTML do modelo escapado, imagens externas não carregadas, links apenas HTTP(S) com isolamento da nova aba, sanitização Angular mantida. Envio conserva idempotência, cancelamento e reconciliação. Falha ao abrir uma conversa limpa o conteúdo anterior e bloqueia envio para o destino anterior. Não houve mudança em credenciais, autenticação, providers ou contratos de persistência.
- Validação local: 254 testes, build de produção e gitleaks do commit/bundle aprovados. O build registra aviso de estilo do chat de 7,98 kB (limite de erro 8 kB), sem alterar budgets. Prévia com API sintética local conferida em desktop e celular, incluindo primeira mensagem, rota, navegação anterior/próxima, Markdown/código, cópia, rolagem e atalhos. Fixtures ficaram fora dos repositórios e não acessaram dados reais.
- Publicação confirmada: merge `a203998da897bf8abb73c482782809af42c232d5`, [CI do PR 36250630945](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36250630945) e [release 36250781331](https://github.com/DevViking-Persike/ia-trainner-frontend-angular/actions/runs/36250781331) aprovados. `/healthz` retornou `prod-a203998da897bf8abb73c482782809af42c232d5-36250781331-1`; Argo `Synced/Healthy`, operação `Succeeded`, Angular Ready na H6 com digest `sha256:45d51d0aad3294a04de25e926d2a8756460d142af340a9a8a28513b3c72ba0a4`.
- Aceite no domínio oficial: primeira mensagem sintética enviada por Enter, criação da rota própria, resposta real do modelo com destaque Markdown e bloco Python, botão “Resposta copiada”, histórico filtrado por título e recuperação das duas mensagens após navegação completa pelo link antigo. A conversa sintética foi preservada como evidência; nenhuma conversa anterior foi excluída. API, treino GPU e consentimentos Gemini não foram alterados nesta entrega.
