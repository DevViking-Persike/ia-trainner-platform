# Esquema PostgreSQL do M2

Origem: C-M2-DDL-V0001/V0002 e C-M2-DDL-DELIVERY. As migrações vivem em `database/ia-trainner-sql-ddl/postgresql/` e são aplicadas pelo Flyway ([ADR-0008](../../adrs/ADR-0008-repos-sql-ddl-dml.md)); o backend lê e escreve com o papel de runtime. A preparação do servidor e o DDL abaixo são a referência do contrato: devem ser validados com Flyway 13.8 em PostgreSQL 17 e 18 descartáveis, duas vezes (a segunda sem efeito), com os testes da seção [Verificação](#verificação); resultados executados ficam no registro de desenvolvimento.

## Servidor, papéis e arquivos

| Item | Valor |
|---|---|
| Servidor | `dados-pg-postgresql.dados.svc.cluster.local:5432`, compartilhado; nenhum servidor novo |
| Banco e schema | `ia_trainner` e `ia_trainner` |
| Criados pelo `infra-k8s` | banco, papéis e schema, exatamente pelo SQL de [preparação](#preparação-do-servidor) |
| `ia_trainner_migrator` | dono do banco e do schema; executa DDL e dados de referência; credencial só em `/ia-trainner/sql-ddl` |
| `ia_trainner_app` | runtime (API e Worker); só `CONNECT` e `SELECT/INSERT/UPDATE/DELETE` por privilégios padrão; sem `CREATE`, `ALTER`, `DROP`, `TRUNCATE` ou `TEMP`; credencial só em `/ia-trainner/backend` e, por referência, em `/ia-trainner/worker` ([configuracao](configuracao.md)) |
| DDL do M2 | `V0001__documents_core.sql` (privilégios, `collections`, `documents`, `document_pages`, `document_processing_steps`, `user_consents`) e `V0002__outbox_inbox.sql` |
| Reservas | `V0003` (M3, conhecimento) e `V0004` (M4, treinamento) |
| Histórico | DDL `ia_trainner.flyway_schema_history`; DML `ia_trainner.flyway_schema_history_dml` |
| DML do M2 | nenhum dado de referência; só o pipeline e o callback de privilégios |

## Preparação do servidor

Normativa e idempotente, por um Job dedicado do `infra-k8s`, sem editar o Job compartilhado `init-databases`: um administrador do servidor a executa com `psql` conectado ao banco `postgres`, com as senhas em `MIGRATOR_PASSWORD` e `APP_PASSWORD` no ambiente, lidas do Infisical por `\getenv`, nunca em argumentos, arquivos SQL ou logs. Todo harness de teste (os `verify.sh` dos dois repositórios SQL e o Testcontainers do backend) roda este mesmo SQL como superusuário antes das migrações. O `ia-trainner-sql-ddl` versiona a cópia de referência em `scripts/verify/infra-bootstrap.sql` e a leva na imagem DDL em `/flyway/bootstrap/infra-bootstrap.sql`, fora das `locations` do Flyway; o DML e o backend a leem da imagem fixada.

```sql
-- Canonical bootstrap for the dedicated infra-k8s Job and isolated integration tests.
-- Run as a superuser connected to postgres with psql 15+, never with query echo enabled.
-- Passwords arrive through the environment, not command-line arguments or SQL files.
\set ON_ERROR_STOP on
\getenv migrator_password MIGRATOR_PASSWORD
\getenv app_password APP_PASSWORD

SELECT format(
    'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
    'ia_trainner_migrator', :'migrator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ia_trainner_migrator')
\gexec
ALTER ROLE ia_trainner_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
    PASSWORD :'migrator_password';

SELECT format(
    'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
    'ia_trainner_app', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ia_trainner_app')
\gexec
ALTER ROLE ia_trainner_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
    PASSWORD :'app_password';

SELECT format('CREATE DATABASE %I OWNER %I', 'ia_trainner', 'ia_trainner_migrator')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ia_trainner')
\gexec
ALTER DATABASE ia_trainner OWNER TO ia_trainner_migrator;
REVOKE ALL ON DATABASE ia_trainner FROM PUBLIC;
GRANT CONNECT ON DATABASE ia_trainner TO ia_trainner_migrator, ia_trainner_app;

\connect ia_trainner
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA IF NOT EXISTS ia_trainner AUTHORIZATION ia_trainner_migrator;
ALTER SCHEMA ia_trainner OWNER TO ia_trainner_migrator;
```

- O PostgreSQL concede `CONNECT` e `TEMPORARY` a `PUBLIC` em todo banco novo. Sem o `REVOKE ALL ON DATABASE`, o `ia_trainner_app` criaria tabelas temporárias e qualquer outro papel do servidor compartilhado conectaria ao banco.
- Nenhum papel tem atributo administrativo, e um não é membro do outro: o `ia_trainner_app` recebe só o `CONNECT` daqui e o que o `V0001` concede.
- O migrador é dono do banco (como cada dono de banco do `init-databases`) e do schema; o Flyway roda com `-createSchemas=false`.

## Tabelas

| Tabela | Conteúdo | Regras principais |
|---|---|---|
| `collections` | coleções | nome único por dono entre `active`; `(id, owner_sub)` único para as chaves estrangeiras compostas |
| `documents` | metadados, estado e erro | coleção só do mesmo dono; `sha256` único por dono fora de `deleting`; `error_*` preenchidos só em `failed`; `version` para concorrência otimista |
| `document_pages` | texto por página | pertence a documento do mesmo dono; cascata na exclusão; sem U+0000 |
| `document_processing_steps` | passos `upload`, `extraction`, `ocr` | mesmas regras de dono e cascata |
| `user_consents` | aceites e revogações | um aceite ativo por dono, finalidade e versão |
| `outbox_messages` | eventos a publicar | envelope completo em `payload`; contexto de trace em `headers` |
| `inbox_processed_messages` | mensagens já processadas | chave `(consumer, message_id)` |

Todas as colunas de instante são `timestamptz` preenchidas pela aplicação (`IClock`), sem `DEFAULT now()`. Os ids são UUID v7 gerados pela aplicação. Os valores permitidos de `media_type` ficam na configuração, não em `CHECK`.

## V0001__documents_core.sql

```sql
-- V0001: documents core for M2 (collections, documents, pages, processing steps, consents).
-- Reference: docs/contracts/m2/banco-de-dados.md (C-M2-DDL-V0001, frozen 2026-09-25) in the main
-- repository. Constraint and index names are part of the contract: the backend maps
-- ux_collections_owner_name, ux_documents_owner_sha256 and ux_user_consents_active to its errors.
-- Checks marked "additive" are not in the reference DDL; they encode rules the contract already
-- states elsewhere and never reject a value the contract allows.
-- Preconditions (roles, executor, schema owner) are enforced by beforeMigrate__guard.sql and the
-- privilege postconditions by afterMigrate__privileges.sql, on every deploy.
-- Timestamps are timestamptz written by the application clock (no database defaults). Upload
-- limits and media types live in the backend configuration, not in CHECK constraints.

-- Privileges -----------------------------------------------------------------------------------
-- Database: CONNECT only for the two roles; nobody but the owner creates temporary tables, views
-- or pg_temp functions. Effective when ia_trainner_migrator owns the database (infra-k8s
-- init-databases); otherwise PostgreSQL only warns, infra-k8s has to revoke it from PUBLIC and
-- afterMigrate__privileges.sql fails until it does.
DO $database$
BEGIN
    EXECUTE format('REVOKE CONNECT, TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO ia_trainner_app', current_database());
END
$database$;

-- Schema ia_trainner is created by infra-k8s (AUTHORIZATION ia_trainner_migrator).
REVOKE ALL ON SCHEMA ia_trainner FROM PUBLIC;
GRANT USAGE ON SCHEMA ia_trainner TO ia_trainner_app;

-- Every table and sequence the migrator creates from here on is DML-only for the runtime role.
-- flyway_schema_history exists before this point and gets nothing; flyway_schema_history_dml,
-- created later by ia-trainner-sql-dml, is revoked by afterMigrate__privileges.sql.
ALTER DEFAULT PRIVILEGES FOR ROLE ia_trainner_migrator IN SCHEMA ia_trainner
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ia_trainner_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ia_trainner_migrator IN SCHEMA ia_trainner
    GRANT USAGE, SELECT ON SEQUENCES TO ia_trainner_app;
-- Functions are executable by PUBLIC by default; nothing the migrator creates should be.
ALTER DEFAULT PRIVILEGES FOR ROLE ia_trainner_migrator
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Collections ----------------------------------------------------------------------------------
CREATE TABLE ia_trainner.collections (
    id              uuid          NOT NULL,
    owner_sub       varchar(255)  NOT NULL,
    organization_id varchar(64),
    name            varchar(120)  NOT NULL,
    name_normalized varchar(120)  NOT NULL,
    description     varchar(2000),
    status          varchar(16)   NOT NULL DEFAULT 'active',
    created_at      timestamptz   NOT NULL,
    updated_at      timestamptz   NOT NULL,
    version         integer       NOT NULL DEFAULT 0,
    CONSTRAINT pk_collections PRIMARY KEY (id),
    -- Target of the owner-consistent foreign key from documents.
    CONSTRAINT uq_collections_id_owner UNIQUE (id, owner_sub),
    CONSTRAINT ck_collections_status CHECK (status IN ('active', 'deleting'))
);

-- Case-insensitive name uniqueness per owner among active collections (409 collection.name_taken).
CREATE UNIQUE INDEX ux_collections_owner_name
    ON ia_trainner.collections (owner_sub, name_normalized) WHERE status = 'active';
-- Worker recovery sweep (every 60 s, all owners): collections in deleting for 15 min.
CREATE INDEX ix_collections_deleting
    ON ia_trainner.collections (updated_at) WHERE status = 'deleting';

COMMENT ON TABLE ia_trainner.collections IS
    'Named groups of documents. Every row belongs to one ZITADEL subject (owner_sub); deletion is asynchronous (status deleting).';
COMMENT ON COLUMN ia_trainner.collections.owner_sub IS
    'ZITADEL subject of the owner. Every query filters by it.';
COMMENT ON COLUMN ia_trainner.collections.name_normalized IS
    'Computed by the application from name (Unicode NFC, trimmed, invariant lower case); unique per owner while active.';
COMMENT ON COLUMN ia_trainner.collections.version IS
    'Optimistic concurrency: UPDATE ... WHERE id = @id AND version = @expected, setting version = version + 1.';

-- Documents ------------------------------------------------------------------------------------
CREATE TABLE ia_trainner.documents (
    id              uuid          NOT NULL,
    owner_sub       varchar(255)  NOT NULL,
    organization_id varchar(64),
    collection_id   uuid,
    original_name   varchar(255)  NOT NULL,
    media_type      varchar(100)  NOT NULL,
    size_bytes      bigint        NOT NULL,
    sha256          char(64)      NOT NULL,
    storage_key     varchar(512)  NOT NULL,
    status          varchar(16)   NOT NULL,
    error_code      varchar(64),
    error_message   varchar(500),
    error_retryable boolean,
    page_count      integer,
    attempt         integer       NOT NULL DEFAULT 0,
    created_at      timestamptz   NOT NULL,
    updated_at      timestamptz   NOT NULL,
    version         integer       NOT NULL DEFAULT 0,
    CONSTRAINT pk_documents PRIMARY KEY (id),
    -- Target of the owner-consistent foreign keys from pages and steps.
    CONSTRAINT uq_documents_id_owner UNIQUE (id, owner_sub),
    -- A document can only live in a collection of the same owner (MATCH SIMPLE: NULL means no
    -- collection). The Worker removes a collection after its documents; deleting one that still
    -- has documents fails with SQLSTATE 23503.
    CONSTRAINT fk_documents_collection FOREIGN KEY (collection_id, owner_sub)
        REFERENCES ia_trainner.collections (id, owner_sub),
    -- Lifecycle C-M2-DOC-STATE: received -> extracting -> (ocr) -> ready | failed; any -> deleting.
    CONSTRAINT ck_documents_status
        CHECK (status IN ('received', 'extracting', 'ocr', 'ready', 'failed', 'deleting')),
    CONSTRAINT ck_documents_size CHECK (size_bytes > 0),
    CONSTRAINT ck_documents_sha256 CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_documents_page_count CHECK (page_count IS NULL OR page_count >= 1),
    CONSTRAINT ck_documents_attempt CHECK (attempt >= 0),
    -- error_* are filled only in failed, and all three together.
    CONSTRAINT ck_documents_error CHECK (
        (status = 'failed' AND error_code IS NOT NULL AND error_message IS NOT NULL
            AND error_retryable IS NOT NULL)
        OR (status <> 'failed' AND error_code IS NULL AND error_message IS NULL
            AND error_retryable IS NULL)),
    -- Additive (armazenamento-s3.md): documents/{ownerKey}/{documentId}/original, where ownerKey is
    -- the first 16 lower-case hex characters of sha256(owner_sub) and documentId is this row's id.
    -- No file name, extension or raw subject can reach the key.
    CONSTRAINT ck_documents_storage_key CHECK (
        storage_key ~ '^documents/[0-9a-f]{16}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/original$'
        AND split_part(storage_key, '/', 3) = id::text),
    -- Additive (api-documentos.md, "Nome do arquivo"): the API keeps only the last path segment and
    -- removes control (Cc) and bidi override characters; an empty name becomes "documento.<ext>".
    -- Explicit code point ranges, so the result does not depend on the database locale.
    CONSTRAINT ck_documents_original_name CHECK (
        original_name <> ''
        AND original_name !~ '[/\\\u0001-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]')
);

-- Listing in created_at, id descending order (keyset pagination), optionally by status.
CREATE INDEX ix_documents_owner_created
    ON ia_trainner.documents (owner_sub, created_at DESC, id DESC);
-- Listing by collection; also serves the collection foreign key and documentCount.
CREATE INDEX ix_documents_owner_collection_created
    ON ia_trainner.documents (owner_sub, collection_id, created_at DESC, id DESC);
-- Same content uploaded twice by the same owner (409 document.duplicate), unless the first is being deleted.
CREATE UNIQUE INDEX ux_documents_owner_sha256
    ON ia_trainner.documents (owner_sub, sha256) WHERE status <> 'deleting';
-- Worker recovery sweep (every 60 s, all owners): received, extracting, ocr and deleting by age.
CREATE INDEX ix_documents_pending
    ON ia_trainner.documents (status, updated_at)
    WHERE status IN ('received', 'extracting', 'ocr', 'deleting');

COMMENT ON TABLE ia_trainner.documents IS
    'Uploaded originals and their processing state. PostgreSQL is the status store; Kafka only transports events.';
COMMENT ON COLUMN ia_trainner.documents.owner_sub IS
    'ZITADEL subject of the owner. Every query filters by it; another owner''s id behaves as not found.';
COMMENT ON COLUMN ia_trainner.documents.original_name IS
    'Display name for listings and Content-Disposition only. Never part of a key, event or log.';
COMMENT ON COLUMN ia_trainner.documents.media_type IS
    'Type detected from the first bytes; the accepted list is Documents__AllowedMediaTypes (configuration).';
COMMENT ON COLUMN ia_trainner.documents.size_bytes IS
    'Bytes stored in S3; the upper limit is Documents__MaxUploadBytes (configuration).';
COMMENT ON COLUMN ia_trainner.documents.storage_key IS
    'S3 key documents/{sha256(owner_sub)[0..16]}/{id}/original in bucket ia-trainner-documents.';
COMMENT ON COLUMN ia_trainner.documents.attempt IS
    'Processing starts in the current cycle (capped by Documents__MaxAttempts); a manual retry resets it to 0.';
COMMENT ON COLUMN ia_trainner.documents.version IS
    'Optimistic concurrency: UPDATE ... WHERE id = @id AND version = @expected, setting version = version + 1.';

-- Pages ----------------------------------------------------------------------------------------
CREATE TABLE ia_trainner.document_pages (
    document_id uuid          NOT NULL,
    number      integer       NOT NULL,
    owner_sub   varchar(255)  NOT NULL,
    method      varchar(8)    NOT NULL,
    text        text          NOT NULL,
    char_count  integer       NOT NULL,
    CONSTRAINT pk_document_pages PRIMARY KEY (document_id, number),
    CONSTRAINT fk_document_pages_document FOREIGN KEY (document_id, owner_sub)
        REFERENCES ia_trainner.documents (id, owner_sub) ON DELETE CASCADE,
    CONSTRAINT ck_document_pages_number CHECK (number >= 1),
    CONSTRAINT ck_document_pages_method CHECK (method IN ('text', 'ocr')),
    CONSTRAINT ck_document_pages_char_count CHECK (char_count >= 0)
);

COMMENT ON TABLE ia_trainner.document_pages IS
    'Extracted text per page (text layer or OCR). Part of the document aggregate; removed with it. Text never holds U+0000.';
COMMENT ON COLUMN ia_trainner.document_pages.char_count IS
    'Written by the application: length of text in UTF-16 code units, the same count M3 uses for slicing.';

-- Processing steps -----------------------------------------------------------------------------
CREATE TABLE ia_trainner.document_processing_steps (
    document_id uuid          NOT NULL,
    name        varchar(16)   NOT NULL,
    owner_sub   varchar(255)  NOT NULL,
    status      varchar(16)   NOT NULL,
    started_at  timestamptz,
    finished_at timestamptz,
    CONSTRAINT pk_document_processing_steps PRIMARY KEY (document_id, name),
    CONSTRAINT fk_document_processing_steps_document FOREIGN KEY (document_id, owner_sub)
        REFERENCES ia_trainner.documents (id, owner_sub) ON DELETE CASCADE,
    CONSTRAINT ck_document_processing_steps_name CHECK (name IN ('upload', 'extraction', 'ocr')),
    CONSTRAINT ck_document_processing_steps_status
        CHECK (status IN ('pending', 'running', 'done', 'skipped', 'failed'))
);

COMMENT ON TABLE ia_trainner.document_processing_steps IS
    'Progress of upload, extraction and OCR for a document. Updated in the same transaction as the document version.';

-- Consents -------------------------------------------------------------------------------------
-- One row per acceptance (consentimento-gemini.md); revoking only fills revoked_at, so the history
-- is kept. At most one active acceptance per owner, purpose and notice version.
CREATE TABLE ia_trainner.user_consents (
    id              uuid          NOT NULL,
    owner_sub       varchar(255)  NOT NULL,
    organization_id varchar(64),
    purpose         varchar(32)   NOT NULL,
    notice_version  varchar(32)   NOT NULL,
    accepted_at     timestamptz   NOT NULL,
    revoked_at      timestamptz,
    CONSTRAINT pk_user_consents PRIMARY KEY (id),
    CONSTRAINT ck_user_consents_purpose CHECK (purpose IN ('gemini')),
    CONSTRAINT ck_user_consents_notice_version CHECK (notice_version ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT ck_user_consents_revoked CHECK (revoked_at IS NULL OR revoked_at >= accepted_at)
);

-- Validity check (owner, purpose, current version, not revoked) and the PUT race (23505 = accepted).
CREATE UNIQUE INDEX ux_user_consents_active
    ON ia_trainner.user_consents (owner_sub, purpose, notice_version) WHERE revoked_at IS NULL;
-- Latest acceptance of any version (lastAcceptedVersion) and the consent history of an owner.
CREATE INDEX ix_user_consents_owner
    ON ia_trainner.user_consents (owner_sub, purpose, accepted_at DESC);

COMMENT ON TABLE ia_trainner.user_consents IS
    'Acceptances of the Google Gemini notice per owner and notice version (LGPD accountability). No IP or user agent.';
COMMENT ON COLUMN ia_trainner.user_consents.notice_version IS
    'Version id of the accepted notice text (gemini-v1, gemini-v2...). Notice texts are immutable per version.';
COMMENT ON COLUMN ia_trainner.user_consents.revoked_at IS
    'Revocation instant: UPDATE ... SET revoked_at = @now WHERE owner_sub = @ownerSub AND purpose = ''gemini'' AND revoked_at IS NULL.';
```

## V0002__outbox_inbox.sql

```sql
-- V0002: transactional outbox and consumer inbox (C-M2-DDL-V0002 and C-M2-EVENTS).
-- Reference: docs/contracts/m2/banco-de-dados.md and eventos-kafka.md in the main repository.
-- Runtime privileges come from the default privileges set in V0001 (DML only).

-- Outbox ---------------------------------------------------------------------------------------
-- Written in the same transaction as the state change: payload is the complete envelope (its
-- messageId is id) and headers hold the trace context. The Worker relay reads up to 100 pending
-- rows in occurred_at, id order (FOR UPDATE SKIP LOCKED) and sets published_at after the ack.
CREATE TABLE ia_trainner.outbox_messages (
    id             uuid          NOT NULL,
    topic          varchar(200)  NOT NULL,
    message_key    varchar(200)  NOT NULL,
    type           varchar(100)  NOT NULL,
    schema_version integer       NOT NULL,
    payload        jsonb         NOT NULL,
    headers        jsonb         NOT NULL DEFAULT '{}'::jsonb,
    occurred_at    timestamptz   NOT NULL,
    published_at   timestamptz,
    attempts       integer       NOT NULL DEFAULT 0,
    last_error     varchar(500),
    CONSTRAINT pk_outbox_messages PRIMARY KEY (id),
    CONSTRAINT ck_outbox_messages_schema_version CHECK (schema_version >= 1),
    CONSTRAINT ck_outbox_messages_attempts CHECK (attempts >= 0)
);

-- Relay scan: pending messages in occurrence order.
CREATE INDEX ix_outbox_messages_pending
    ON ia_trainner.outbox_messages (occurred_at, id) WHERE published_at IS NULL;
-- Daily purge of messages published more than 7 days ago.
CREATE INDEX ix_outbox_messages_published
    ON ia_trainner.outbox_messages (published_at) WHERE published_at IS NOT NULL;

COMMENT ON TABLE ia_trainner.outbox_messages IS
    'Integration events pending or already published. Payloads carry no file names, text, tokens or credentials.';
COMMENT ON COLUMN ia_trainner.outbox_messages.message_key IS
    'Kafka key: the aggregate id as text (never a file name, subject or free text).';
COMMENT ON COLUMN ia_trainner.outbox_messages.last_error IS
    'Type and code of the last publish failure only; never payload content or credentials.';

-- Inbox ----------------------------------------------------------------------------------------
-- A consumer inserts (consumer, message_id) in the handler's final transaction with
-- ON CONFLICT DO NOTHING; zero rows means the message was already processed (at-least-once).
CREATE TABLE ia_trainner.inbox_processed_messages (
    consumer     varchar(100)  NOT NULL,
    message_id   uuid          NOT NULL,
    processed_at timestamptz   NOT NULL,
    CONSTRAINT pk_inbox_processed_messages PRIMARY KEY (consumer, message_id)
);

-- Daily purge of rows processed more than 7 days ago (the topic keeps 24 h).
CREATE INDEX ix_inbox_processed_messages_processed_at
    ON ia_trainner.inbox_processed_messages (processed_at);

COMMENT ON TABLE ia_trainner.inbox_processed_messages IS
    'Idempotency record of handled messages per consumer group (e.g. ia-trainner-worker.documents).';
```

## Uso pelo backend

| Operação | Forma |
|---|---|
| Leitura de coleção ou documento | sempre `WHERE owner_sub = @ownerSub` (mais `status <> 'deleting'` ou `status = 'active'`); as únicas leituras sem dono são as do `IDocumentWorkerStore`, exclusivo do Worker, que decide pelo estado da linha ([portas-dotnet](portas-dotnet.md)) |
| Listagem de documentos | `ix_documents_owner_created` ou `ix_documents_owner_collection_created`, paginação por `(created_at, id)` decrescente |
| Duplicado no upload | consulta por `(owner_sub, sha256)` e, na corrida, violação de `ux_documents_owner_sha256` (SQLSTATE 23505) |
| Alteração de estado | `UPDATE ... SET version = version + 1 ... WHERE id = @id AND version = @expected` |
| Upload em coleção | `SELECT ... FROM ia_trainner.collections WHERE id = @id AND owner_sub = @ownerSub FOR SHARE`, confirmando `active` |
| Outbox | inserção na transação da mudança; relay com `ix_outbox_messages_pending`, `FOR UPDATE SKIP LOCKED` |
| Inbox | `INSERT ... ON CONFLICT (consumer, message_id) DO NOTHING`; zero linhas = já processada |
| Varreduras | `ix_documents_pending` e `ix_collections_deleting` |
| Limpeza diária | outbox publicado e inbox com mais de 7 dias (`ix_outbox_messages_published`, `ix_inbox_processed_messages_processed_at`) |

Conexão: `ConnectionStrings__Platform` com `Search Path=ia_trainner`; pool máximo de 10 conexões na API e 5 no Worker, fixado em código porque o servidor é compartilhado ([configuracao](configuracao.md)).

## Entrega das migrações

- Imagem por repositório (`ia-trainner-sql-ddl` e `ia-trainner-sql-dml`): `flyway/flyway` fixada por digest mais os arquivos SQL, publicada no Zot por digest.
- Aplicação por Jobs Kubernetes como hooks PreSync da Application única `ia-trainner`: DDL na onda `-2` e DML na onda `-1`, antes de API e Worker. Credencial do migrador pelo Secret `ia-trainner-sql-ddl` (Infisical `/ia-trainner/sql-ddl`), nunca presente em `/ia-trainner/backend` nem em `/ia-trainner/worker`.
- Parâmetros comuns: `-schemas=ia_trainner -defaultSchema=ia_trainner -createSchemas=false -cleanDisabled=true -validateMigrationNaming=true`. DDL: `-table=flyway_schema_history`. DML: `-table=flyway_schema_history_dml -baselineOnMigrate=true -baselineVersion=0`.
- O histórico do DML nasce depois dos privilégios padrão e, sem cuidado, ficaria legível e gravável pelo `ia_trainner_app` (comprovado no teste). O repositório DML traz os callbacks `docker/callbacks/afterBaseline__revoke_history.sql` e `docker/callbacks/afterMigrate__revoke_history.sql` com `REVOKE ALL ON TABLE ia_trainner.flyway_schema_history_dml FROM ia_trainner_app;`.
- Os testes de integração do backend fixam a mesma imagem DDL em `services/backend/tests/IATrainner.Integration.Tests/ddl-image.txt` e a aplicam num PostgreSQL do Testcontainers.

## Verificação

`scripts/verify.sh` de cada repositório SQL sobe um PostgreSQL descartável da mesma versão major do servidor compartilhado, roda como superusuário o SQL de [preparação](#preparação-do-servidor) duas vezes (a segunda sem efeito), aplica as migrações duas vezes e confere:

- `PUBLIC` sem privilégio no banco, sem `USAGE` em `public` e em `ia_trainner`; nenhum dos dois papéis com atributo administrativo, e `ia_trainner_app` fora do migrador;
- papel sem concessões, criado como os demais do servidor, recusado ao conectar (42501);
- como `ia_trainner_app`: `CREATE` (em `ia_trainner` e em `public`), `ALTER`, `DROP`, `TRUNCATE`, `CREATE INDEX` e tabela temporária recusados (42501); nenhum acesso às duas tabelas de histórico;
- nome de coleção repetido do mesmo dono recusado e liberado quando a coleção vai a `deleting`; mesmo nome aceito para outro dono;
- documento de um dono em coleção de outro, página ou passo com dono divergente e coleção apagada com documentos recusados (23503);
- `sha256` repetido do mesmo dono recusado e liberado em `deleting`; `error_*` fora de `failed`, `failed` sem erro, `page_count` zero, estados e métodos inválidos recusados (23514); texto com U+0000 recusado (22021);
- exclusão do documento remove páginas e passos em cascata; aceite ativo repetido recusado e novo aceite possível depois da revogação; inbox recusa `messageId` repetido.
