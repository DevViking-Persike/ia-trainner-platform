# API de documentos

Origem: C-M2-DOCUMENTS-API. Regras comuns no [README](README.md); códigos em [erros](erros.md); estados em [ciclo-de-vida-documento](ciclo-de-vida-documento.md); tabelas em [banco-de-dados](banco-de-dados.md). Upload e reprocessamento exigem consentimento vigente ([consentimento-gemini](consentimento-gemini.md)).

## Modelos

`DocumentSummary`:

| Campo | Tipo | Origem |
|---|---|---|
| `id` | uuid | `documents.id` |
| `name` | string | `documents.original_name` (sanitizado) |
| `mediaType` | string | `documents.media_type` (detectado pelos bytes) |
| `sizeBytes` | integer | `documents.size_bytes` |
| `collectionId` | uuid \| null | `documents.collection_id` |
| `status` | `received` \| `extracting` \| `ocr` \| `ready` \| `failed` | `documents.status`; `deleting` nunca aparece |
| `pageCount` | integer \| null | `documents.page_count` |
| `error` | `{"code", "message", "retryable"}` \| null | `error_code`, `error_message`, `error_retryable`; só em `failed` |
| `createdAt`, `updatedAt` | instante | `created_at`, `updated_at` |

`DocumentDetail` é `DocumentSummary` mais:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `sha256` | string | 64 hex minúsculos |
| `steps` | array | `{"name": "upload"\|"extraction"\|"ocr", "status": "pending"\|"running"\|"done"\|"skipped"\|"failed", "startedAt", "finishedAt"}` (instantes ou `null`), sempre nessa ordem |
| `pages` | array | `{"number", "method": "text"\|"ocr", "charCount"}` das páginas já gravadas, em ordem |

No M3 o detalhe ganha `indexing`, fora deste contrato. `DocumentPage` (rota de página) é `{"number", "method", "charCount", "text"}`.

## Rotas

| Método e rota | Sucesso | Erros |
|---|---|---|
| `POST /api/documents` (multipart) | `202`, `Location: /api/documents/{id}`, `DocumentSummary` em `received` | 400 `request.invalid`; 404 `collection.not_found`; 409 `consent.required`, `document.duplicate`; 413 `document.too_large`; 415 `document.unsupported_type`; 422 `document.empty`, `validation.failed`; 503 `service.unavailable` |
| `GET /api/documents?collectionId=&status=&cursor=&limit=` | `200 {"items": DocumentSummary[], "nextCursor": string\|null}` | 404 `collection.not_found`; 422 `validation.failed` |
| `GET /api/documents/summary` | `200 {"collections", "documents", "ready", "processing", "failed"}` | — |
| `GET /api/documents/limits` | `200 {"maxUploadBytes", "allowedMediaTypes", "maxPages"}` | — |
| `GET /api/documents/{id}` | `200 DocumentDetail` | 404 `document.not_found` |
| `GET /api/documents/{id}/pages/{number}` | `200 DocumentPage` | 404 `document.not_found`, `document.page_not_found` |
| `GET /api/documents/{id}/content` | `200` com os bytes originais | 404 `document.not_found`; 503 `service.unavailable` |
| `DELETE /api/documents/{id}` | `202 {"id", "status": "deleting"}` | 404 `document.not_found` |
| `POST /api/documents/{id}/retry` | `202 DocumentSummary` em `received` | 404 `document.not_found`; 409 `document.invalid_transition`, `consent.required` |

## Upload

`multipart/form-data`, um arquivo por requisição, partes nesta ordem:

1. `collectionId` (opcional): UUID em texto; precisa vir antes de `file`.
2. `file` (obrigatória): o arquivo, com `filename`.

Outra parte, parte repetida ou `collectionId` depois de `file` dá 400 `request.invalid`.

Ordem das verificações:

1. Sessão, função e CSRF (middleware).
2. Configuração do M2 presente; senão 503 `service.unavailable`.
3. `Content-Length` acima de `Documents__MaxUploadBytes` + 1 MiB dá 413 `document.too_large` sem ler o corpo. O Kestrel limita esta rota a esse valor; as demais rotas do M2 aceitam até 64 KiB.
4. Consentimento vigente; senão 409 `consent.required`.
5. `collectionId`, se enviado: UUID válido (senão 422, campo `collectionId`: `invalid`) de coleção `active` do dono (senão 404 `collection.not_found`).
6. Tipo pelos primeiros bytes (tabela abaixo): 415 `document.unsupported_type` ou 422 `document.empty`.
7. Envio ao S3 em streaming (upload multipart em partes de 8 MiB), contando bytes e calculando SHA-256. Passou de `Documents__MaxUploadBytes`: aborta o upload no S3 e responde 413.
8. Mesmo dono com o mesmo `sha256` fora de `deleting`: apaga o objeto e responde 409 `document.duplicate` com `existingId`.
9. Transação: `SELECT ... FOR SHARE` da coleção confirmando `active`, `INSERT` em `documents` e nos três `document_processing_steps`, outbox `document.uploaded`. Violação de `ux_documents_owner_sha256` numa corrida dá o mesmo 409. Qualquer falha remove o objeto (melhor esforço; sobras são varridas pelo Worker, ver [armazenamento-s3](armazenamento-s3.md)).
10. `202`.

A API nunca carrega o arquivo inteiro em memória nem o grava em disco.

### Detecção de tipo

| `mediaType` | Regra |
|---|---|
| `application/pdf` | bytes 0–4 = `25 50 44 46 2D` (`%PDF-`) |
| `image/png` | bytes 0–7 = `89 50 4E 47 0D 0A 1A 0A` |
| `image/jpeg` | bytes 0–2 = `FF D8 FF` |
| `image/webp` | bytes 0–3 = `RIFF` e bytes 8–11 = `WEBP` |
| `text/markdown` | nenhuma assinatura acima; extensão `.md` ou `.markdown`; primeiros 8 KiB em UTF-8 válido (BOM opcional; sequência cortada no fim do bloco é tolerada) e sem byte `00` |
| `text/plain` | mesma regra, extensão `.txt` |

O `Content-Type` da parte e a extensão de arquivos binários são ignorados. Tipo fora de `Documents__AllowedMediaTypes`, texto com outra extensão, UTF-16 ou binário desconhecido (DOCX incluído) dá 415. A validação completa do UTF-8 acontece no Worker (`document.invalid_encoding`).

### Nome do arquivo

`filename*` (UTF-8) tem precedência sobre `filename`. A API grava em `original_name` só o último segmento depois de `/` ou `\`, remove caracteres de controle e de direção bidi (U+202A–U+202E, U+2066–U+2069), aplica NFC, apara as pontas e limita a 255 caracteres preservando a extensão. Vazio vira `documento` com a extensão do tipo (`.pdf`, `.png`, `.jpg`, `.webp`, `.txt`, `.md`). O nome só aparece nas respostas e no download; nunca em chaves S3, eventos, logs ou traces.

## Listagem, resumo e limites

- Listagem em ordem de `createdAt` e `id` decrescentes; `limit` de 1 a 100 (padrão 25); `nextCursor` é opaco e o cliente só o devolve em `cursor`.
- Filtros: `collectionId` (coleção ativa do dono, senão 404) e `status` (um dos cinco estados visíveis). Parâmetro inválido dá 422 com o campo em `errors`.
- `summary`: contagens do dono sem `deleting`: `collections` (ativas), `documents`, `ready`, `processing` (`received` + `extracting` + `ocr`) e `failed`.
- `limits`: valores efetivos de `Documents__MaxUploadBytes`, `Documents__AllowedMediaTypes` e `Documents__MaxPages`, para a validação prévia no navegador.

## Página e download

- Página: texto gravado de uma página já processada. Páginas de TXT e MD têm até 10.000 caracteres; páginas de PDF, o que o documento tiver.
- Download, em qualquer estado visível, transmitido do S3 sem buffer completo:

| Cabeçalho | Valor |
|---|---|
| `Content-Type` | `media_type`; texto com `; charset=utf-8` |
| `Content-Disposition` | `attachment; filename="<reserva ASCII>"; filename*=UTF-8''<nome codificado>` |
| `Content-Length` | `size_bytes` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Security-Policy` | `default-src 'none'; sandbox` |
| `Cache-Control` | `no-store` |

O Angular baixa com `HttpClient` (`responseType: 'blob'`; o cookie acompanha, sem `Authorization`) e salva por um link temporário. Não há pré-visualização no M2: a CSP bloqueia `blob:` em imagens e frames.

## Exclusão e reprocessamento

- **DELETE:** o documento passa a `deleting` na mesma transação do outbox `document.deletion_requested`; some das listas e o detalhe devolve 404. O Worker apaga o objeto, (M3) trechos e vetores e as linhas. É definitivo: não há lixeira nem soft delete. Citações antigas do M3 exibem "documento removido".
- **Retry:** só em `failed` com `retryable = true` e com consentimento vigente. Volta a `received`, zera `attempt` e o erro, recoloca `extraction` e `ocr` em `pending` e emite `document.retry_requested` com `trigger = "user"`.

## Orientação ao cliente

- Validar tamanho e tipo com `limits` antes de enviar e, mesmo assim, tratar 413 e 415.
- Progresso do envio por `HttpClient` com `reportProgress: true` e `observe: 'events'`; no máximo 3 envios simultâneos por aba.
- Enquanto houver documento em `received`, `extracting` ou `ocr` na tela, consultar a cada 3 s, aumentando 1,5× até 15 s; parar quando todos forem finais ou ao sair da página.
- 409 `document.duplicate` depois de falha de rede pode indicar que o envio anterior foi aceito: oferecer abrir `existingId`.
- Rótulos: `received` Recebido, `extracting` Extraindo texto, `ocr` OCR em andamento, `ready` Pronto, `failed` Falhou. Passos: `upload` Envio, `extraction` Extração de texto, `ocr` OCR. Estado do passo: `pending` Aguardando, `running` Em andamento, `done` Concluído, `skipped` Não necessário, `failed` Falhou.
