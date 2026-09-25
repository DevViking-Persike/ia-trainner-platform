# Contratos do M2 — documentos

Congelados em 25/09/2026 (pacote WP-M2-00). Valem para o backend (`services/backend`), o frontend (`apps/frontend`), as migrações (`database/ia-trainner-sql-ddl` e `database/ia-trainner-sql-dml`) e o `infra-k8s`. Partem do `contractsToAgree` do plano de migração, adaptado às decisões do titular registradas em [development-status](../../operations/development-status.md).

| Contrato | Arquivo | Origem no plano |
|---|---|---|
| Erros HTTP (problem+json e códigos estáveis) | [erros](erros.md) | C-M2-ERRORS |
| API de coleções | [api-colecoes](api-colecoes.md) | C-M2-COLLECTIONS-API |
| API de documentos | [api-documentos](api-documentos.md) | C-M2-DOCUMENTS-API |
| Ciclo de vida e processamento do documento | [ciclo-de-vida-documento](ciclo-de-vida-documento.md) | C-M2-DOC-STATE |
| Consentimento para o Google Gemini | [consentimento-gemini](consentimento-gemini.md) | novo (decisão do titular) |
| Esquema PostgreSQL e entrega das migrações | [banco-de-dados](banco-de-dados.md) | C-M2-DDL-V0001/V0002, C-M2-DDL-DELIVERY |
| Tópicos e envelope Kafka | [eventos-kafka](eventos-kafka.md) | C-M2-EVENTS |
| Buckets e chaves S3/RustFS | [armazenamento-s3](armazenamento-s3.md) | C-M2-STORAGE |
| Chaves de configuração | [configuracao](configuracao.md) | C-M2-CONFIG |
| Worker e ajustes de implantação | [deploy-worker](deploy-worker.md) | C-M2-DEPLOY |
| Shell e navegação do Angular | [shell-angular](shell-angular.md) | C-M2-SHELL |
| Portas .NET | [portas-dotnet](portas-dotnet.md) | C-M2-PORTS |

Decisões estruturais: [ADR-0007](../../adrs/ADR-0007-sessao-bff-cookie.md) (sessão BFF), [ADR-0008](../../adrs/ADR-0008-repos-sql-ddl-dml.md) (repositórios e migrações SQL) e [ADR-0009](../../adrs/ADR-0009-documentos-assincronos.md) (processamento assíncrono).

## Regras comuns

- **Origem.** Tudo em `https://ia-trainner.victorpersike.dev.br/api/...`; o Traefik envia `/api` ao Service `ia-trainner-backend` sem reescrever o caminho.
- **Autenticação.** Cookie de sessão `__Host-iat_session` do BFF no navegador, ou `Authorization: Bearer` com access token do ZITADEL para outros clientes ([auth-bff](../../architecture/auth-bff.md)). Todas as rotas destes contratos exigem a política `PlatformUser` (função `user` do projeto). O SPA nunca envia `Authorization` nem guarda tokens.
- **CSRF.** Todo método diferente de GET/HEAD exige `X-IAT-Request: 1`; se o navegador enviar `Origin`, ele deve ser igual a `Frontend__Origin`. Falha: `403 {"error":"csrf"}`, formato herdado do M1.
- **Isolamento.** O dono é o `sub` do ZITADEL (`owner_sub`). Toda leitura e escrita filtra por ele; recurso de outro dono responde exatamente como inexistente (404). No Worker, o dono vem sempre da linha no banco, nunca do evento. `organization_id` é gravado para compartilhamento futuro, mas não autoriza nada no M2.
- **JSON.** UTF-8, camelCase, enums como strings minúsculas; propriedades desconhecidas são ignoradas; corpo JSON até 64 KiB.
- **Identificadores.** UUID v7 gerado pelo servidor, em minúsculas com hífens. Rotas com `{id}` fora desse formato não casam e respondem `404 route.not_found`.
- **Instantes.** UTC em ISO 8601 (o .NET emite `+00:00`); o Angular exibe em `America/Sao_Paulo`.
- **Cache.** Toda resposta de `/api/**` leva `Cache-Control: no-store`.
- **Dados sensíveis.** Logs, traces e métricas não recebem nome de arquivo, texto extraído, `ownerSub`, token nem segredo; use `documentId`, `collectionId` e `messageId`. Fixtures e exemplos são sintéticos.

## Adaptações em relação ao plano

1. Sessão BFF por cookie com Redis e telas próprias ([ADR-0007](../../adrs/ADR-0007-sessao-bff-cookie.md)) no lugar do bearer no navegador; CSRF por `X-IAT-Request`. O download usa `HttpClient` com o cookie, sem cabeçalho `Authorization`.
2. Consentimento versionado por usuário para o Gemini: rotas `/api/consents/gemini` e tabela `user_consents`; upload, reprocessamento e cada envio ao Gemini (páginas de OCR e, no M3, indexação e perguntas) exigem consentimento vigente; o texto do aviso depende do nível de faturamento das chaves.
3. Papéis `ia_trainner_migrator` e `ia_trainner_app`, pasta `postgresql/` dos repositórios SQL ([ADR-0008](../../adrs/ADR-0008-repos-sql-ddl-dml.md)); `user_consents` entra no `V0001`, preservando a reserva de `V0003` (M3) e `V0004` (M4).
4. As tabelas filhas (`document_pages`, `document_processing_steps`) repetem `owner_sub` com chave estrangeira composta, e documento só referencia coleção do mesmo dono (defesa em profundidade no banco).
5. Respostas 401/403/404 do framework também têm `code` estável; só a recusa CSRF e `/api/auth/*` mantêm o formato do M1.
6. Acréscimos: `GET /api/documents/limits`, `GET /api/documents/{id}/pages/{number}`, `Documents__MaxPages`, catálogo fechado de falhas de processamento, `trigger` em `document.retry_requested`, varreduras de recuperação e de objetos órfãos no Worker.
7. TXT e MD não têm assinatura binária: são aceitos só com extensão `.txt`, `.md` ou `.markdown` e conteúdo UTF-8.
8. O Worker tem pasta e Secret próprios (`/ia-trainner/worker`, `ia-trainner-worker`), sem credenciais de sessão, login e e-mail; `Kafka__*` e `Gemini__*` ficam fora do Secret da API.
9. Eventos Kafka são avisos não confiáveis (broker sem autenticação): cada handler exige o estado atual no banco e lê dono e chave do objeto da linha; `document.deletion_requested` perde `storageKey`.
10. Preparação do banco por SQL normativo no `infra-k8s` e em todos os testes, sem `CONNECT` e `TEMPORARY` para `PUBLIC`.

## Mudanças

Contrato congelado. Implementação que precise divergir altera este diretório no repositório principal, no mesmo ciclo de revisão do componente e antes do merge dele. Mudança incompatível de evento exige novo `schemaVersion`; no banco, nova migração (migração aplicada nunca é editada); na API, nova rota ou campo opcional.
