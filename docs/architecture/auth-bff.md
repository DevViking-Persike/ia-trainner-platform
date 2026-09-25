# Autenticação: tela própria e BFF .NET

Decisão do titular em 25/09/2026: a IA Trainner usa telas próprias de login, 2FA (TOTP), cadastro com verificação de e-mail e recuperação de senha. A tela hospedada do ZITADEL não é usada. O navegador não recebe tokens: a API .NET atua como BFF, obtém os tokens OIDC do ZITADEL no servidor e mantém a sessão no Redis; o navegador guarda apenas um cookie `httpOnly`. Mesmo padrão validado no WebContador, implementado em .NET.

## Componentes

| Peça | Papel |
|---|---|
| Angular (`apps/frontend`) | Telas `/entrar`, `/cadastro`, `/verificar-email`, `/recuperar-senha`, `/recuperar-senha/nova`; nenhum SDK OIDC e nenhum token no bundle ou storage |
| API .NET (`services/backend`) | Endpoints `/api/auth/*`; Session API v2, OIDC service v2 e User service v2 do ZITADEL com o usuário de serviço de login; cookie de sessão; sessão e chaves de Data Protection no Redis |
| ZITADEL | Emite sessão e tokens (projeto "IA Trainner", função `user`); app OIDC do BFF configurado para Login V2 com URL base própria; usuário de serviço `ia-trainner-login` com papel de instância `IAM_LOGIN_CLIENT` |
| Redis compartilhado | Usuário ACL `ia-trainner`, somente chaves `ia-trainner:*` |
| E-mail | A API envia os e-mails (códigos devolvidos pelo ZITADEL com `returnCode`) por SMTP configurado no Infisical |

## Contrato HTTP

Todas as rotas usam JSON e a mesma origem. Toda requisição com método diferente de GET/HEAD para `/api/**` exige o cabeçalho `X-IAT-Request: 1` e, se o navegador enviar `Origin`, ele deve ser exatamente a origem configurada em `Frontend__Origin`; caso contrário a API responde `403 {"error":"csrf"}`. Motivo: os subdomínios de `victorpersike.dev.br` são *same-site*, então `SameSite` sozinho não impede CSRF. Erros seguem `{"error": "<código>"}` (e `application/problem+json` para 401/403/404 genéricos). Senhas, códigos, links e tokens nunca aparecem em logs ou traces.

| Método e rota | Corpo | Respostas |
|---|---|---|
| `GET /api/auth/session` | — | `200 {"authenticated":false}` ou `200 {"authenticated":true,"name":string?,"expiresAt":ISO}` |
| `POST /api/auth/login` | `{"loginName","password"}` | `200 {"next":"done"}` + cookie de sessão; `200 {"next":"totp"}` + cookie de login pendente; `401 invalid_credentials` (usuário inexistente, senha errada ou inativo, sem distinção); `423 locked`; `403 mfa_setup_required` (política exige 2FA e a conta não tem TOTP); `403 unsupported_second_factor` (conta só tem passkey/U2F/OTP por SMS ou e-mail); `429 rate_limited` |
| `POST /api/auth/login/totp` | `{"code"}` (6 dígitos) | `200 {"next":"done"}` + cookie de sessão; `401 invalid_code`; `401 login_expired` (sem login pendente, expirado ou após 5 tentativas); `429` |
| `POST /api/auth/logout` | — | `204`; encerra a sessão do ZITADEL, apaga a sessão no Redis e os cookies |
| `GET /api/auth/password-policy` | — | `200 {"minLength","requiresUppercase","requiresLowercase","requiresNumber","requiresSymbol"}` |
| `POST /api/auth/register` | `{"givenName","familyName","email","password"}` | `202 {"status":"verification_sent"}` (inclusive quando o e-mail já existe, sem revelar); `400 invalid_input`; `400 weak_password`; `503 email_unavailable` se o SMTP não estiver configurado; `429` |
| `POST /api/auth/email/verify` | `{"userId","code"}` | `204`; `400 invalid_code` |
| `POST /api/auth/email/resend` | `{"email"}` | `202` sempre (sem revelar se a conta existe); `503 email_unavailable`; `429` |
| `POST /api/auth/password/reset` | `{"loginName"}` (usuário ou e-mail) | `202` sempre; `503 email_unavailable`; `429` |
| `POST /api/auth/password` | `{"userId","code","newPassword"}` | `204`; `400 invalid_code`; `400 weak_password` |

Rotas protegidas existentes (`/api/me`, `/api/platform` e as próximas) aceitam o cookie de sessão (navegador) ou `Authorization: Bearer` com access token do ZITADEL (outros clientes). Sem sessão: `401` JSON, nunca redirecionamento. A política `PlatformUser` continua exigindo a função `user` do projeto; contas novas não recebem a função automaticamente e veem `/acesso-negado` até um administrador liberar.

## Fluxos no servidor

1. **Senha.** `POST /v2/sessions` com `checks.user.loginName` e `checks.password.password`. Obter o usuário da sessão (`GET /v2/sessions/{id}`), consultar `GET /v2/users/{userId}/authentication_methods` e as configurações de login da organização (exigência de 2FA). Com TOTP configurado, guardar `{sessionId, sessionToken, userId}` no Redis por 5 minutos e devolver `next: totp` com o cookie de login pendente.
2. **TOTP.** `PATCH /v2/sessions/{id}` com `checks.totp.code`; no máximo 5 tentativas por login pendente.
3. **Conclusão.** Gerar PKCE (S256), `state` e `nonce`. Chamar `/oauth/v2/authorize` do app do BFF sem seguir redirecionamento e sem credenciais; o ZITADEL responde `302` com `Location` possivelmente **relativo** (observado em 25/09/2026: `/ui/v2/login/login?authRequest=V2_…`). Extrair apenas o parâmetro `authRequest`, exigir o prefixo `V2_` e ignorar host/caminho do `Location`; o cabeçalho `x-zitadel-login-client` não é necessário. Conferir `GET /v2/oidc/auth_requests/{id}` (`clientId` e `redirectUri` iguais aos configurados; o usuário de serviço pode finalizar requisições de qualquer app, então essa checagem é obrigatória). Finalizar com `POST /v2/oidc/auth_requests/{id}` e `{"session":{"sessionId","sessionToken"}}`, ler `code` e `state` da `callbackUrl`, trocar o código em `/oauth/v2/token` com `code_verifier`. Validar o access token com os mesmos parâmetros do esquema Bearer (issuer, audience = ID do projeto, assinatura, validade, não é ID token) e o `nonce` do ID token.
4. **Sessão.** Autenticação por cookie do ASP.NET Core com `ITicketStore` no Redis (`ia-trainner:session:*`). Cookie `__Host-iat_session`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, validade igual à do access token, sem renovação deslizante. O ticket guarda as claims do access token validado, o nome de exibição e os dados da sessão ZITADEL para o logout; tokens não vão para o cookie. Chaves de Data Protection persistidas no Redis (`ia-trainner:dataprotection-keys`). Cookie de login pendente: `__Host-iat_login`, 5 minutos.
5. **Cadastro.** `POST /v2/users/human` na organização configurada, com `email.returnCode` e senha sem troca obrigatória; e-mail com link `{Frontend__BaseUrl}/verificar-email?userId=…&code=…`. Verificação: `POST /v2/users/{userId}/email/verify`.
6. **Recuperação.** Localizar o usuário por login ou e-mail; `POST /v2/users/{userId}/password_reset` com `returnCode`; e-mail com link `{Frontend__BaseUrl}/recuperar-senha/nova?userId=…&code=…`. Nova senha: `POST /v2/users/{userId}/password` com `verificationCode`.
7. **Limites.** Rate limiting por IP (e por login nas rotas de senha) com respostas `429`; tamanhos máximos de entrada; respostas neutras onde a existência da conta seria revelada.

## Configuração (Infisical `dev /ia-trainner/backend`)

| Chave | Tipo |
|---|---|
| `Authentication__Authority`, `Authentication__Audience`, `OTEL_*` | existentes, públicas |
| `Zitadel__ClientId`, `Zitadel__RedirectUri`, `Zitadel__OrganizationId`, `Zitadel__ServiceUserId` | públicas |
| `Frontend__Origin`, `Frontend__BaseUrl` | públicas |
| `Zitadel__ServiceToken` | segredo (PAT da conta de serviço `ia-trainner-login`, válido até 25/09/2027) |
| `ConnectionStrings__Redis` | segredo (usuário ACL `ia-trainner`) |
| `Email__SmtpHost`, `Email__SmtpPort`, `Email__From`, `Email__FromName`, `Email__UseStartTls` | públicas (Hostinger: `smtp.hostinger.com`, 465 com TLS implícito, logo `UseStartTls=false` significa TLS na conexão; nunca texto puro) |
| `Email__SmtpUsername`, `Email__SmtpPassword` | segredo |

Sem ZITADEL ou Redis configurados, `/api/auth/*` responde `503 {"error":"auth_unavailable"}` e as rotas protegidas continuam fechadas. Sem SMTP completo (inclusive senha vazia), cadastro, reenvio e recuperação respondem `503 email_unavailable`; o login continua funcionando.
