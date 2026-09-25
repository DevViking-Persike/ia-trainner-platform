# Progresso de desenvolvimento por marcos

Registro mantido pelo workflow `/entregar-plataforma`. Estados: `pendente`, `em andamento`, `implementado`, `validado localmente`, `publicado`, `verificado no ambiente`, `bloqueado`. IDs abaixo são técnicos e públicos; nenhum token, segredo ou dado pessoal é registrado.

| Marco | Estado | Atualizado |
|---|---|---|
| M1 — acesso | em andamento (fluxo OIDC verificado; tela própria de login pendente) | 25/09/2026 |
| M2 — documentos | pendente | — |
| M3 — conhecimento e conversas | pendente | — |
| M4 — treinamento | pendente | — |

## Decisões registradas para os próximos marcos

- Mudanças de banco (decisão do titular em 25/09/2026): esquema e dados do PostgreSQL ficam em dois repositórios novos, `ia-trainner-sql-ddl` (DDL/migrações) e `ia-trainner-sql-dml` (DML/dados de referência), incluídos no principal como submódulos em `workspace.json`. Aplicar o mesmo modelo ao MongoDB e ao Redis onde fizer sentido. Cada banco usa os servidores compartilhados existentes, com credenciais próprias da aplicação: acesso de migração separado do acesso de runtime (DML em `/ia-trainner/backend`). Criar no início do M2.
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

### Pendências

- Opcional: exercitar a página `/acesso-negado` com uma conta real sem a função (exige remover e restaurar temporariamente a atribuição no ZITADEL); hoje coberta pelo 403 real da API e por testes unitários.
- Sem cliente ZITADEL para `localhost`: o login local aparece como indisponível até existir um app em modo de desenvolvimento separado.
- Tela própria de login: substituir a tela hospedada do ZITADEL mantendo a emissão de tokens pelo ZITADEL e a validação atual da API (próxima ação do M1).
- Depois do M1: concluir o inventário da migração Svelte → Angular e iniciar o M2 com os repositórios `ia-trainner-sql-ddl`/`ia-trainner-sql-dml`.
