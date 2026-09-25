# Esquema PostgreSQL do M2

Origem: C-M2-DDL-V0001/V0002 e C-M2-DDL-DELIVERY. As migrações vivem em `database/ia-trainner-sql-ddl/postgresql/` e são aplicadas pelo Flyway ([ADR-0008](../../adrs/ADR-0008-repos-sql-ddl-dml.md)); o backend lê e escreve com o papel de runtime. A preparação do servidor e o DDL abaixo são a referência do contrato: foram aplicados com Flyway 13.8 em PostgreSQL 16, 17 e 18 descartáveis, duas vezes (a segunda sem efeito), com os testes da seção [Verificação](#verificação).

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

Normativa e idempotente, no padrão do `init-databases` do `infra-k8s`: um administrador do servidor a executa com `psql` conectado ao banco `postgres`, com as senhas em variáveis do `psql` (`-v migrator_password=… -v app_password=…`) lidas do Infisical, nunca do Git. Todo harness de teste (os `verify.sh` dos dois repositórios SQL e o Testcontainers do backend) roda este mesmo SQL como superusuário antes das migrações. O `ia-trainner-sql-ddl` versiona a cópia de referência em `scripts/verify/infra-bootstrap.sql` e a leva na imagem DDL em `/flyway/bootstrap/infra-bootstrap.sql`, fora das `locations` do Flyway; o DML e o backend a leem da imagem fixada.

```sql
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
              'ia_trainner_migrator', :'migrator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ia_trainner_migrator')
\gexec
ALTER ROLE ia_trainner_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'migrator_password';

SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
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
-- Executado por ia_trainner_migrator, dono do schema ia_trainner.
GRANT USAGE ON SCHEMA ia_trainner TO ia_trainner_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ia_trainner_migrator IN SCHEMA ia_trainner
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ia_trainner_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ia_trainner_migrator IN SCHEMA ia_trainner
  GRANT USAGE, SELECT ON SEQUENCES TO ia_trainner_app;

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
  CONSTRAINT uq_collections_id_owner UNIQUE (id, owner_sub),
  CONSTRAINT ck_collections_status CHECK (status IN ('active', 'deleting'))
);
CREATE UNIQUE INDEX ux_collections_owner_name
  ON ia_trainner.collections (owner_sub, name_normalized) WHERE status = 'active';
CREATE INDEX ix_collections_deleting
  ON ia_trainner.collections (updated_at) WHERE status = 'deleting';

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
  CONSTRAINT uq_documents_id_owner UNIQUE (id, owner_sub),
  CONSTRAINT fk_documents_collection FOREIGN KEY (collection_id, owner_sub)
    REFERENCES ia_trainner.collections (id, owner_sub),
  CONSTRAINT ck_documents_status
    CHECK (status IN ('received', 'extracting', 'ocr', 'ready', 'failed', 'deleting')),
  CONSTRAINT ck_documents_size CHECK (size_bytes > 0),
  CONSTRAINT ck_documents_sha256 CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ck_documents_page_count CHECK (page_count IS NULL OR page_count >= 1),
  CONSTRAINT ck_documents_attempt CHECK (attempt >= 0),
  CONSTRAINT ck_documents_error CHECK (
    (status = 'failed' AND error_code IS NOT NULL AND error_message IS NOT NULL
      AND error_retryable IS NOT NULL)
    OR (status <> 'failed' AND error_code IS NULL AND error_message IS NULL
      AND error_retryable IS NULL))
);
CREATE INDEX ix_documents_owner_created
  ON ia_trainner.documents (owner_sub, created_at DESC, id DESC);
CREATE INDEX ix_documents_owner_collection_created
  ON ia_trainner.documents (owner_sub, collection_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX ux_documents_owner_sha256
  ON ia_trainner.documents (owner_sub, sha256) WHERE status <> 'deleting';
CREATE INDEX ix_documents_pending
  ON ia_trainner.documents (status, updated_at)
  WHERE status IN ('received', 'extracting', 'ocr', 'deleting');

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
CREATE UNIQUE INDEX ux_user_consents_active
  ON ia_trainner.user_consents (owner_sub, purpose, notice_version) WHERE revoked_at IS NULL;
CREATE INDEX ix_user_consents_owner
  ON ia_trainner.user_consents (owner_sub, purpose, accepted_at DESC);
```

## V0002__outbox_inbox.sql

```sql
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
CREATE INDEX ix_outbox_messages_pending
  ON ia_trainner.outbox_messages (occurred_at, id) WHERE published_at IS NULL;
CREATE INDEX ix_outbox_messages_published
  ON ia_trainner.outbox_messages (published_at) WHERE published_at IS NOT NULL;

CREATE TABLE ia_trainner.inbox_processed_messages (
  consumer     varchar(100)  NOT NULL,
  message_id   uuid          NOT NULL,
  processed_at timestamptz   NOT NULL,
  CONSTRAINT pk_inbox_processed_messages PRIMARY KEY (consumer, message_id)
);
CREATE INDEX ix_inbox_processed_messages_processed_at
  ON ia_trainner.inbox_processed_messages (processed_at);
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
- O histórico do DML nasce depois dos privilégios padrão e, sem cuidado, ficaria legível e gravável pelo `ia_trainner_app` (comprovado no teste). O repositório DML traz o callback `postgresql/afterMigrate__revoke_history.sql` com `REVOKE ALL ON TABLE ia_trainner.flyway_schema_history_dml FROM ia_trainner_app;`.
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
