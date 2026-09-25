# Erros HTTP (problem+json)

Origem: C-M2-ERRORS. Vale para as rotas protegidas de `/api/**` e para as respostas genéricas do framework. Exceções herdadas do M1: as rotas `/api/auth/*` e a recusa CSRF usam `{"error":"<código>"}` ([auth-bff](../../architecture/auth-bff.md)).

## Formato

`Content-Type: application/problem+json` (RFC 9457).

| Campo | Presença | Conteúdo |
|---|---|---|
| `type` | sempre | `urn:ia-trainner:problem:<code>` |
| `title` | sempre | frase curta e fixa em PT-BR, uma por código |
| `status` | sempre | status HTTP |
| `code` | sempre | código estável das tabelas abaixo |
| `traceId` | sempre | trace id W3C da requisição (32 hex), para suporte |
| `detail` | opcional | explicação segura em PT-BR |
| `instance` | opcional | caminho da requisição, sem query string |
| `errors` | só em `validation.failed` | `{"<campo>": ["<código de campo>"]}` |
| extensões | conforme o código | `maxBytes`, `allowedMediaTypes`, `existingId`, `noticeVersion`, `retryAfterSeconds` |

`detail` e extensões nunca carregam texto de exceção, SQL, corpo de resposta de provedor, caminho de disco, nome de arquivo, token ou chave. A Application devolve `ApplicationError(code, kind)` e a API o converte ([portas-dotnet](portas-dotnet.md)). Respostas geradas pelo framework (autenticação, rota inexistente, método, limite de corpo, exceção não tratada) recebem o código pelo status: 400 `request.invalid`, 401 `auth.unauthenticated`, 403 `auth.forbidden`, 404 `route.not_found`, 405 `request.method_not_allowed`, 413 `request.too_large` (`document.too_large` na rota de upload), 415 `request.unsupported_media_type`, 500 `server.error`.

Códigos de campo em `errors`: `required`, `too_long`, `invalid`, `out_of_range`.

```json
{
  "type": "urn:ia-trainner:problem:document.too_large",
  "title": "Arquivo acima do limite",
  "status": 413,
  "code": "document.too_large",
  "detail": "O limite é de 50 MiB por arquivo.",
  "instance": "/api/documents",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "maxBytes": 52428800
}
```

## Códigos gerais

| code | Status | Quando | Mensagem na interface |
|---|---|---|---|
| `request.invalid` | 400 | JSON ou multipart malformado, parte obrigatória ausente, partes fora de ordem no upload | Não foi possível ler a requisição. Recarregue a página e tente de novo. |
| `validation.failed` | 422 | regra de campo violada; detalhes em `errors` | mensagem por campo |
| `auth.unauthenticated` | 401 | sem sessão ou token válido; inclui `WWW-Authenticate: Bearer`; nunca redireciona | tratado pelo interceptor |
| `auth.forbidden` | 403 | autenticado sem a função `user` do projeto | leva a `/acesso-negado` |
| `route.not_found` | 404 | rota `/api` inexistente, por exemplo módulo ainda não publicado | Este módulo ainda não está disponível. |
| `request.method_not_allowed` | 405 | método não suportado pela rota | genérica |
| `request.too_large` | 413 | corpo JSON acima de 64 KiB | genérica |
| `request.unsupported_media_type` | 415 | `Content-Type` diferente do exigido pela rota | genérica |
| `concurrency.conflict` | 409 | alteração concorrente que persistiu após 3 releituras | O item foi alterado ao mesmo tempo. Atualize a página e tente de novo. |
| `service.unavailable` | 503 | PostgreSQL ou S3 indisponível, ou configuração do M2 ausente; `retryAfterSeconds` opcional e cabeçalho `Retry-After` | Serviço temporariamente indisponível. Tente novamente em instantes. |
| `server.error` | 500 | falha inesperada | Erro inesperado. Se persistir, informe o código de suporte (`traceId`). |

## Coleções, documentos e consentimento

| code | Status | Quando | Mensagem na interface |
|---|---|---|---|
| `collection.not_found` | 404 | id inexistente, de outro dono ou em exclusão; vale também para `collectionId` no upload e nos filtros | Coleção não encontrada. |
| `collection.name_taken` | 409 | nome já usado por outra coleção ativa do mesmo dono, sem diferenciar maiúsculas | Já existe uma coleção com esse nome. |
| `document.not_found` | 404 | id inexistente, de outro dono ou em exclusão | Documento não encontrado. |
| `document.page_not_found` | 404 | página inexistente ou ainda não processada | Página não encontrada. |
| `document.empty` | 422 | arquivo com 0 byte | O arquivo está vazio. |
| `document.too_large` | 413 | acima de `Documents__MaxUploadBytes`; extensão `maxBytes` | O arquivo passa do limite de {maxBytes em MiB} MiB. |
| `document.unsupported_type` | 415 | tipo detectado fora da lista; extensão `allowedMediaTypes` | Tipo de arquivo não aceito. Envie PDF, PNG, JPEG, WebP, TXT ou MD. |
| `document.duplicate` | 409 | mesmo conteúdo (SHA-256) já existe para o dono fora de exclusão; extensão `existingId` | Você já enviou este arquivo. (com link para `existingId`) |
| `document.invalid_transition` | 409 | reprocessamento fora de `failed` com `retryable = true` | Este documento não pode ser reprocessado agora. |
| `consent.required` | 409 | upload ou reprocessamento sem consentimento vigente; extensão `noticeVersion` (atual) | Para processar documentos, leia e aceite o aviso sobre o uso do Google Gemini. |
| `consent.notice_outdated` | 409 | aceite de versão diferente da atual; extensão `noticeVersion` (atual) | O aviso foi atualizado. Leia a nova versão antes de aceitar. |

## Falhas de processamento

Não são respostas HTTP: aparecem em `error` do documento em `failed` ([api-documentos](api-documentos.md)). A mensagem desta tabela é gravada em `documents.error_message` e devolvida em `error.message`; o catálogo é fechado.

| code | retryable | Quando | Mensagem |
|---|---|---|---|
| `document.no_text` | não | nenhuma página com texto, nem após OCR | Não encontramos texto neste documento, nem com OCR. |
| `document.corrupted` | não | arquivo ilegível: PDF inválido ou imagem recusada como inválida pelo provedor | O arquivo está corrompido ou não pôde ser lido. |
| `document.encrypted` | não | PDF protegido por senha | O PDF está protegido por senha. Envie uma versão sem proteção. |
| `document.too_many_pages` | não | PDF acima de `Documents__MaxPages` | O documento passa do limite de páginas da plataforma. |
| `document.invalid_encoding` | não | TXT ou MD que não é UTF-8 válido | O arquivo de texto precisa estar em UTF-8. |
| `document.consent_required` | sim | consentimento ausente ou revogado antes de uma chamada de OCR, no início ou no meio do documento | O OCR precisa do seu consentimento para o uso do Google Gemini. Aceite o aviso e tente novamente. |
| `ai.provider_unavailable` | sim | Gemini com 429, 5xx, tempo esgotado ou chaves recusadas, depois das retentativas | O serviço de OCR está indisponível no momento. Tente novamente mais tarde. |
| `storage.unavailable` | sim | S3/RustFS indisponível depois das retentativas | O armazenamento de arquivos está indisponível. Tente novamente mais tarde. |
| `document.processing_interrupted` | sim | processamento interrompido `Documents__MaxAttempts` vezes | O processamento foi interrompido. Tente novamente. |
| `document.processing_error` | sim | falha inesperada; a mensagem foi para a DLQ | Erro inesperado no processamento. Tente novamente; se persistir, avise o administrador. |

## Cliente Angular

- Um helper em `core/api` extrai o código: `code` do problem+json, `error` do formato do M1, `network` para status 0, `service.unavailable` para 502/503/504 sem corpo JSON (gateway) e `unexpected` no resto.
- 401: o interceptor chama `AuthSession.rejectedByApi` e leva a `/entrar?returnUrl=...` uma única vez, sem laço.
- 403 com `code = auth.forbidden`, em qualquer rota protegida: `/acesso-negado`. 403 com `{"error":"csrf"}`: aviso para recarregar a página, nunca `/acesso-negado`.
- Demais códigos: mensagem da tabela (a página pode especializar), com `title` como reserva. Toasts nunca mostram problem+json bruto.
