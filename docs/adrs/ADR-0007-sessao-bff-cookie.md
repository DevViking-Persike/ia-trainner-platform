# ADR-0007 — Sessão da SPA por BFF .NET com cookie e Redis

## Status
Aceito · em implementação (M1)

## Data
2026-09-25

## Contexto
A primeira entrega do M1 (verificada em 25/09/2026) usou Authorization Code + PKCE no navegador com `oidc-client-ts`, tokens no `sessionStorage` da aba, sem refresh token, e a tela de login hospedada do ZITADEL. O plano de migração assumia esse modelo para M2–M4: bearer enviado pelo Angular, download de arquivos com o cabeçalho `Authorization` e tratamento de expiração no navegador.

No mesmo dia o titular decidiu que a IA Trainner terá telas próprias de login, 2FA (TOTP), cadastro com verificação de e-mail e recuperação de senha no seu domínio, sem usar a tela hospedada do ZITADEL. Telas próprias precisam das APIs de sessão e de usuário do ZITADEL, que exigem credencial de serviço e não podem ser chamadas pelo navegador. Tokens em storage acessível por JavaScript também ficam expostos a XSS. O contrato detalhado está em [auth-bff](../architecture/auth-bff.md).

## Decisão
- A API .NET é o BFF. O Angular tem as telas `/entrar`, `/cadastro`, `/verificar-email`, `/recuperar-senha` e `/recuperar-senha/nova` e chama `/api/auth/*`. A API usa Session API v2, OIDC v2 e User v2 do ZITADEL com a conta de serviço `ia-trainner-login` (papel `IAM_LOGIN_CLIENT`); o ZITADEL continua emitindo os tokens pelo app `ia-trainner-bff`, com PKCE S256 feito no servidor e conferência de `clientId` e `redirectUri` de cada auth request.
- O navegador guarda só o cookie `__Host-iat_session` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`), com validade igual à do access token e sem renovação deslizante. O ticket (claims do access token validado, nome de exibição e dados da sessão ZITADEL para o logout) fica no Redis em `ia-trainner:session:*`; as chaves de Data Protection em `ia-trainner:dataprotection-keys`. Tokens nunca chegam ao bundle, ao storage ou ao cookie.
- CSRF: todo método diferente de GET/HEAD em `/api/**` exige `X-IAT-Request: 1` e, havendo `Origin`, que ele seja igual a `Frontend__Origin`; senão `403 {"error":"csrf"}`. `SameSite` sozinho não basta porque os subdomínios de `victorpersike.dev.br` são same-site.
- Rotas protegidas aceitam o cookie (navegador) ou `Authorization: Bearer` com access token do ZITADEL (outros clientes), com a mesma validação (issuer, audience = projeto, assinatura, validade, recusa de ID token) e a política `PlatformUser`. Sem sessão: 401 JSON, nunca redirecionamento.
- `POST /api/auth/logout` encerra a sessão no ZITADEL, apaga a do Redis e os cookies.
- Substitui a premissa do plano (PKCE no navegador, `sessionStorage`, telas hospedadas) e o [ADR-0006](ADR-0006-chat-history-via-api.md). Os contratos do M2 em diante assumem cookie e CSRF ([contratos do M2](../contracts/m2/README.md)).

## Alternativas consideradas
- Manter PKCE no navegador com a tela hospedada (entrega inicial do M1) — contraria a decisão de tela própria; tokens em `sessionStorage` ficam ao alcance de XSS e sem renovação silenciosa.
- Telas próprias chamando as APIs do ZITADEL direto do navegador — exigiria expor o token da conta de serviço.
- Login UI V2 oficial do ZITADEL hospedado à parte — mais um serviço (Next.js) para publicar, proteger e manter, com outra stack.
- Tokens criptografados no próprio cookie, sem Redis — cookie grande (limite de cerca de 4 KB) e revogação impossível no servidor.

## Consequências
- Ganhos: nenhum token no JavaScript; revogação no servidor; UX, 2FA e cadastro próprios; mesma origem, sem CORS; Angular sem SDK OIDC.
- Trade-offs: a API passa a depender do Redis para autenticar (indisponível: `503 auth_unavailable`; perda dos dados do Redis encerra todas as sessões) e guarda um PAT de alto privilégio da conta de serviço, só no Infisical.
- Toda rota mutável precisa da proteção CSRF, inclusive o upload multipart do M2; clientes que não sejam o SPA também enviam `X-IAT-Request`.
- Sem renovação: a sessão termina com o access token. Upload ou tela aberta no vencimento recebem 401 e o usuário entra de novo; com arquivos de até 50 MiB, a perda fica restrita ao envio em curso.
- O e-mail transacional (cadastro e recuperação) passa a ser responsabilidade da API, com SMTP configurado no Infisical.

## Impacto em código, testes e operação
- Backend: `/api/auth/*`, autenticação por cookie com `ITicketStore` no Redis ao lado do esquema Bearer, filtro CSRF global, `ICurrentUser` a partir das mesmas claims nos dois esquemas.
- Frontend: remove `oidc-client-ts`, `/auth/callback` e o armazenamento de tokens; o interceptor envia `X-IAT-Request: 1` só em URLs relativas `/api/`, nunca `Authorization`; download por `HttpClient` como blob com o cookie; 401 leva a `/entrar?returnUrl=`.
- Testes: fluxos de login, TOTP, logout, expiração e CSRF (cabeçalho ausente, `Origin` divergente) na API; isolamento por dono com dois usuários em cada rota do M2.
- Operação: usuário ACL `ia-trainner` no Redis compartilhado, NetworkPolicy para Redis e SMTP, chaves `Zitadel__*`, `Frontend__*`, `ConnectionStrings__Redis` e `Email__*` em `/ia-trainner/backend`.

## ADRs relacionados
- ADR-0006 — Auth via cookie httpOnly e Tauri Store (superado por este)
- ADR-0009 — Processamento assíncrono de documentos (consome as rotas protegidas por este modelo)
