# Armazenamento S3/RustFS

Origem: C-M2-STORAGE. Configuração em [configuracao](configuracao.md).

| Item | Valor |
|---|---|
| Servidor | RustFS no flex4a, S3 com endereçamento path-style; acesso só do servidor (API e Worker) |
| Buckets | `ia-trainner-documents` (M2); reservados `ia-trainner-datasets` e `ia-trainner-artifacts` (M4) |
| Credenciais | chave de aplicação restrita aos buckets da IA Trainner, em `/ia-trainner/backend` |
| Bucket | privado, sem versionamento de objetos e sem object lock (a exclusão precisa ser definitiva); regra de ciclo de vida que aborta uploads multipart incompletos após 1 dia |

## Chave do original

`documents/{ownerKey}/{documentId}/original`

- `ownerKey`: os 16 primeiros caracteres hexadecimais minúsculos do SHA-256 dos bytes UTF-8 de `owner_sub`. É um pseudônimo que agrupa os objetos por dono sem expor o `sub`.
- `documentId`: UUID em minúsculas.
- Sem nome de arquivo, extensão, `sub` ou outro dado do usuário na chave, e sem metadados `x-amz-meta-*`. O `Content-Type` do objeto é o `media_type` detectado.
- A chave é montada só por `DocumentStorageKey` (Application) e gravada em `documents.storage_key`; leituras e exclusões usam a coluna, sem recalcular.

Exemplo sintético: `documents/3f1c9a0d2b7e4c55/0192f5c4-8e1a-7c3b-9d2e-5a6b7c8d9e0f/original`.

## Operações

| Operação | Regra |
|---|---|
| Gravação (API) | upload multipart do S3 em partes de 8 MiB, com SHA-256 e tamanho calculados no streaming; erro ou limite estourado chama `AbortMultipartUpload` |
| Leitura | streaming para a resposta HTTP (API) ou para `/tmp` (Worker) |
| Exclusão (Worker) | `DeleteObject` idempotente: objeto ausente conta como sucesso |
| Órfãos (Worker, diária) | objeto em `documents/` com mais de 24 h e sem linha em `documents` com o mesmo id é apagado; cobre falha entre a gravação e o commit do upload |

Não há URL assinada para o navegador: upload e download passam por `/api` e a CSP do frontend não muda. URLs assinadas curtas só existirão no M4, para o Job da P7.
