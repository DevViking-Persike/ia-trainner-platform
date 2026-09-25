# Progresso de desenvolvimento por marcos

Registro mantido pelo workflow `/entregar-plataforma`. Estados: `pendente`, `em andamento`, `implementado`, `validado localmente`, `publicado`, `verificado no ambiente`, `bloqueado`. IDs abaixo são técnicos e públicos; nenhum token, segredo ou dado pessoal é registrado.

| Marco | Estado | Atualizado |
|---|---|---|
| M1 — acesso | em andamento (tela própria + BFF publicados e login verificado; faltam cadastro/recuperação com e-mail real e limpeza) | 25/09/2026 |
| M2 — documentos | em andamento (contratos, repositórios DDL/DML em branches; infra pendente) | 25/09/2026 |
| M3 — conhecimento e conversas | pendente | — |
| M4 — treinamento | pendente | — |

## Decisões registradas para os próximos marcos

- Mudanças de banco (decisão do titular em 25/09/2026): esquema e dados do PostgreSQL ficam nos repositórios privados `ia-trainner-sql-ddl` e `ia-trainner-sql-dml`, submódulos em `database/` (criados em 25/09/2026). Flyway com SQL puro aplicado por Job PreSync do Argo; papéis `ia_trainner_migrator` (DDL e dados de referência) e `ia_trainner_app` (runtime, só DML), sem reaproveitar credenciais administrativas. Validadores/índices do MongoDB em `ia-trainner-sql-ddl/mongodb`; Redis sem repositório (usuário ACL próprio já criado).
- M2 (decisões do titular em 25/09/2026): uploads até 50 MiB de PDF, PNG, JPEG, WebP, TXT e MD (DOCX depois); envio de documentos ao Gemini permitido com aviso claro e consentimento registrado por usuário, P7 só como último recurso sem misturar índices; exclusão definitiva em cascata assíncrona (metadados, arquivo, trechos e vetores), citações antigas passam a indicar documento removido.
- Argo CD (decisão do titular em 25/09/2026): uma única Application multi-source `ia-trainner` no AppProject dedicado, com a branch `gitops` de cada componente como fonte.
- Tela de login (decisão do titular em 25/09/2026): a IA Trainner usa tela própria de login no seu domínio; a tela hospedada do ZITADEL não será usada. O M1 só conclui com essa tela publicada e verificada.
- Migração Svelte → Angular e refatoração dos componentes: paralelizar com Workflow e worktrees isoladas por pacote de trabalho, depois dos contratos acordados; inventário em execução.

## M1 — acesso

### Plano e contratos

Fluxo: `Entrar` → ZITADEL (Authorization Code + PKCE, state e nonce) → `/auth/callback` → `/app` → API .NET com bearer token → contexto autorizado na tela.

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
5. M2: integrar a passada de reconciliação dos pacotes (branches `worktree-wf_59df0d72-c93-9` no principal, `codex/m2-ddl-bootstrap`, `codex/m2-dml-bootstrap`), criar no cluster banco `ia_trainner`, papéis e esquema, pasta Infisical `/ia-trainner/sql-ddl`, tópicos Kafka, bucket RustFS e fontes Argo; depois os pacotes WP-M2-10…40 do plano (`.workspace-local/migration-inventory-2026-09-25.json`).
6. Observado fora do escopo: CronJob `postgres-backup` falhando há 4 dias e `mongodb-exporter` em crashloop no cluster.
