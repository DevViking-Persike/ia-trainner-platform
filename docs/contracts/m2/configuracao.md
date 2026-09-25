# Configuração do M2

Origem: C-M2-CONFIG. Valores só no Infisical; nenhum valor de produção em `appsettings*.json`, no Git, em argumentos, build args, logs ou no bundle Angular. Chave obrigatória ausente fecha a funcionalidade: a API responde 503 `service.unavailable` nas rotas do M2 (o M1 continua funcionando) e o Worker não fica pronto.

## Runtime: `/ia-trainner/backend`

Materializado pelo operador do Infisical como Secret `ia-trainner-backend` e lido por `envFrom` na API e no Worker. As chaves do M1 (`Authentication__*`, `OTEL_*`, `Zitadel__*`, `Frontend__*`, `ConnectionStrings__Redis`, `Email__*`) não mudam ([auth-bff](../../architecture/auth-bff.md)). O M2 acrescenta:

| Chave | Tipo | Usada por | Valor |
|---|---|---|---|
| `ConnectionStrings__Platform` | segredo | API, Worker | Npgsql com o papel `ia_trainner_app`, host `dados-pg-postgresql.dados.svc.cluster.local`, porta 5432, banco `ia_trainner`, `Search Path=ia_trainner` |
| `Kafka__BootstrapServers` | pública | Worker | `kafka.dados.svc.cluster.local:9092` |
| `Kafka__ClientId` | pública | Worker | `ia-trainner-worker` |
| `S3__ServiceUrl` | pública | API, Worker | URL interna do RustFS, definida pelo `infra-k8s` |
| `S3__Region` | pública | API, Worker | `us-east-1` (exigida pela assinatura SigV4; o RustFS não a usa) |
| `S3__ForcePathStyle` | pública | API, Worker | `true` |
| `S3__AccessKey`, `S3__SecretKey` | segredo | API, Worker | chave de aplicação restrita aos buckets da IA Trainner |
| `S3__Buckets__Documents` | pública | API, Worker | `ia-trainner-documents` |
| `Gemini__ApiKey`, `Gemini__FallbackApiKey` | segredo | Worker | referências do Infisical a `/embedding` `sdk-gemini-1` e `sdk-gemini-2`, sem copiar valores nem renomear as originais |
| `Gemini__OcrModel` | pública | Worker | id de modelo multimodal conferido na API do Gemini antes de configurar; sem valor padrão no código |
| `Documents__MaxUploadBytes` | pública | API | `52428800` (50 MiB) |
| `Documents__AllowedMediaTypes` | pública | API | `application/pdf,image/png,image/jpeg,image/webp,text/plain,text/markdown` |
| `Documents__MaxAttempts` | pública | Worker | `3` |
| `Documents__MaxPages` | pública | API, Worker | `500` (proposta; confirmar com o titular) |

Regras:

- `Documents__AllowedMediaTypes` só pode conter tipos que o detector conhece ([api-documentos](api-documentos.md)); valor desconhecido conta como configuração ausente (503 nas rotas do M2 e erro no log de inicialização). DOCX entra depois, com detector e extrator próprios.
- O pool do PostgreSQL é fixado em código, não na string: no máximo 10 conexões na API e 5 no Worker, porque o servidor é compartilhado.
- Constantes de código, não configuração: nomes de tópicos, grupo de consumo, versão atual do aviso de consentimento, intervalos das varreduras (60 s), prazos de recuperação (60 min e 15 min), limpeza de 7 dias, partes de 8 MiB e páginas lógicas de 10.000 caracteres.
- A API não usa Kafka nem Gemini no M2, mas recebe o mesmo Secret; separar Secrets por workload fica para quando houver motivo concreto.
- Reservadas: M3 `ConnectionStrings__Mongo`, `Qdrant__Endpoint`, `Qdrant__ApiKey`, `Knowledge__ActiveProfileId`, `Gemini__ChatModel`; M4 `S3__Buckets__Datasets`, `S3__Buckets__Artifacts`, `Training__Namespace`, `Training__ImageConfigMap`, `Training__OllamaNamespace`, `Training__OllamaDeployment`, `Ollama__BaseUrl`.

## Migrações: `/ia-trainner/sql-ddl`

Só credenciais do migrador, materializadas como Secret `ia-trainner-sql-ddl` e montadas apenas nos Jobs PreSync de DDL e DML ([ADR-0008](../../adrs/ADR-0008-repos-sql-ddl-dml.md)). Nunca aparecem em `/ia-trainner/backend` nem nos pods da API e do Worker.

| Chave | Tipo | Valor |
|---|---|---|
| `FLYWAY_URL` | pública | `jdbc:postgresql://dados-pg-postgresql.dados.svc.cluster.local:5432/ia_trainner` |
| `FLYWAY_USER` | pública | `ia_trainner_migrator` |
| `FLYWAY_PASSWORD` | segredo | senha do migrador |

## Desenvolvimento local

`python3 scripts/with-infisical.py backend -- ...` injeta só o escopo do backend, com as referências expandidas. Testes de integração usam Testcontainers (PostgreSQL, Kafka, MinIO) com valores sintéticos gerados no próprio teste; o teste que chama o Gemini de verdade só roda com `GEMINI_INTEGRATION=1`.
