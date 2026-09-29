# Armazenamento S3/RustFS

Origem: C-M2-STORAGE. Configuração em [configuracao](configuracao.md).

| Item | Valor |
|---|---|
| Servidor | RustFS no flex4a, S3 com endereçamento path-style; acesso só do servidor (API e Worker) |
| Bucket e prefixos | `ia-trainner`, privado: `doc/` (documentos), `data/` (datasets), `art/` (artefatos e resultados) |
| Credenciais | chave de aplicação restrita aos três prefixos da IA Trainner, em `/ia-trainner/backend` e, por referência, em `/ia-trainner/worker` |
| Bucket | privado, sem versionamento de objetos e sem object lock (a exclusão precisa ser definitiva); regra de ciclo de vida que aborta uploads multipart incompletos após 1 dia |

## Chave lógica e caminho físico do original

Chave lógica persistida: `documents/{ownerKey}/{documentId}/original`. Caminho físico: `s3://ia-trainner/doc/{ownerKey}/{documentId}/original`.

- `ownerKey`: os 16 primeiros caracteres hexadecimais minúsculos do SHA-256 dos bytes UTF-8 de `owner_sub`. É um pseudônimo que agrupa os objetos por dono sem expor o `sub`.
- `documentId`: UUID em minúsculas.
- Sem nome de arquivo, extensão, `sub` ou outro dado do usuário na chave, e sem metadados `x-amz-meta-*`. O `Content-Type` do objeto é o `media_type` detectado.
- A chave lógica é montada só por `DocumentStorageKey` (Application) e gravada em `documents.storage_key`; leituras e exclusões usam a coluna, sem recalcular. `S3KeyLayout` traduz `documents/` para `doc/` na Infrastructure. Listagens fazem a tradução inversa para preservar a limpeza de órfãos. Não é necessária migração SQL.

Exemplo sintético: `documents/3f1c9a0d2b7e4c55/0192f5c4-8e1a-7c3b-9d2e-5a6b7c8d9e0f/original`.

## Operações

| Operação | Regra |
|---|---|
| Gravação (API) | upload multipart do S3 em partes de 8 MiB, com SHA-256 e tamanho calculados no streaming; erro ou limite estourado chama `AbortMultipartUpload` |
| Leitura | streaming para a resposta HTTP (API) ou para `/tmp` (Worker) |
| Exclusão (Worker) | `DeleteObject` idempotente: objeto ausente conta como sucesso |
| Órfãos (Worker, diária) | objeto físico em `doc/` (chave lógica `documents/`) com mais de 24 h e sem linha em `documents` com o mesmo id é apagado; cobre falha entre a gravação e o commit do upload |

Não há URL assinada para o navegador: upload e download passam por `/api` e a CSP do frontend não muda. O Job Python usa identidade S3 própria via Secret do Infisical; não usa URL assinada. Pode ler `data/` e ler/gravar `art/`, sem acesso a `doc/` nem permissão para sobrescrever datasets.

## Layout e configuração

`S3__Buckets__Documents`, `S3__Buckets__Datasets` e `S3__Buckets__Artifacts` apontam
para `ia-trainner`. `S3__Prefixes__Documents=doc/`, `S3__Prefixes__Datasets=data/`
e `S3__Prefixes__Artifacts=art/` são fornecidas pelo Infisical à API e ao Worker.
Os prefixos lógicos `documents/`, `datasets/` e `executions/` permanecem nos
registros/contratos; o adaptador substitui apenas o primeiro segmento. Os valores
padrão antigos permitem implantar o código antes de mudar a configuração.

No Python, `FINETUNING_S3_BUCKET=ia-trainner`,
`FINETUNING_S3_DATASET_PREFIX=data/` e `FINETUNING_S3_ARTIFACT_PREFIX=art/` são
obrigatórios no Secret runtime, além das credenciais existentes. O adaptador
traduz os mesmos caminhos lógicos do manifest v1 antes de assinar requisições.

O bucket não tem policy pública, versionamento ou object lock. As permissões
ficam nas policies das identidades de aplicação/Job do infra-k8s. O ciclo de vida
abrange os três prefixos e aborta multipart incompleto em um dia. Marcadores de
pasta de zero bytes permitem mostrar `art/`, `data/` e `doc/` no console vazio.
