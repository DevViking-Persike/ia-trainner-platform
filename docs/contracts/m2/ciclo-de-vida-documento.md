# Ciclo de vida e processamento do documento

Origem: C-M2-DOC-STATE. O estado vive em `documents.status`; o PostgreSQL é a única fonte de estado e o Kafka só transporta eventos ([ADR-0009](../../adrs/ADR-0009-documentos-assincronos.md)). Códigos de falha no [catálogo](erros.md#falhas-de-processamento).

## Estados

| Estado | Visível na API | Significado |
|---|---|---|
| `received` | sim | arquivo aceito e guardado; aguarda o Worker |
| `extracting` | sim | lendo a camada de texto |
| `ocr` | sim | OCR pelo Gemini nas páginas sem texto utilizável |
| `ready` | sim | todas as páginas gravadas; final |
| `failed` | sim | falha com código do catálogo; final até um reprocessamento |
| `deleting` | não | exclusão pedida; terminal; o Worker remove tudo fisicamente |

## Transições

| De | Para | Quem | Gatilho | Efeitos na mesma transação |
|---|---|---|---|---|
| — | `received` | API | upload aceito | linha e passos (`upload` = `done`, `extraction` e `ocr` = `pending`); outbox `document.uploaded` |
| `received` | `extracting` | Worker | `document.uploaded` ou `document.retry_requested` | `attempt + 1`; páginas anteriores apagadas; `extraction` = `running` |
| `extracting`, `ocr` | `extracting` | Worker | reentrega após interrupção (com `attempt < Documents__MaxAttempts`) ou reexecução do handler | `attempt + 1` só na reentrega; recomeça do zero |
| `extracting` | `ocr` | Worker | alguma página sem texto utilizável | páginas de texto e `page_count` gravados; `extraction` = `done`; `ocr` = `running` |
| `extracting` | `ready` | Worker | todas as páginas com texto | `extraction` = `done`; `ocr` = `skipped`; outbox `document.processed` |
| `ocr` | `ready` | Worker | OCR concluído com algum texto no documento | `ocr` = `done`; outbox `document.processed` |
| `extracting`, `ocr` | `failed` | Worker | falha do catálogo | passo corrente = `failed`; `error_code`, `error_message`, `error_retryable` |
| `failed` com `retryable` | `received` | API | `POST /api/documents/{id}/retry` | `attempt = 0`; erro limpo; `extraction` e `ocr` = `pending`; outbox `document.retry_requested` (`trigger = "user"`) |
| qualquer um exceto `deleting` | `deleting` | API | DELETE do documento ou da coleção | erro limpo; outbox `document.deletion_requested` ou `collection.deletion_requested` |
| `deleting` | removido | Worker | evento de exclusão | objeto, (M3) trechos e vetores, linhas |

Qualquer outra transição é proibida, por exemplo `ready` → `received`, `failed` sem `retryable` → `received` ou saída de `deleting`. O agregado `Document` do Domain aplica esta tabela; violação vira `document.invalid_transition`. Colunas `error_*` são preenchidas somente em `failed` (restrição `ck_documents_error`).

## Concorrência e tentativas

- Toda alteração: `UPDATE ... SET ..., version = version + 1, updated_at = @now WHERE id = @id AND version = @expected`. Zero linhas é conflito: o caso de uso relê e reaplica até 3 vezes; na API, persistindo, responde 409 `concurrency.conflict`. O Worker relê e, se o documento sumiu ou está em `deleting`, encerra sem erro.
- `attempt` conta os inícios de processamento do ciclo atual: +1 ao sair de `received` e a cada reentrega depois de interrupção (queda do Worker ou evento da varredura); o reprocessamento manual zera. Reinício após interrupção só enquanto `attempt < Documents__MaxAttempts` (padrão 3); depois, `failed` com `document.processing_interrupted`.
- Falha transitória numa operação (chamada ao Gemini, leitura do S3, transação no PostgreSQL) é repetida na própria operação, sem recomeçar o documento. Esgotada, `failed` com o código da causa e `retryable = true`.
- Exceção inesperada no handler faz o consumidor reexecutá-lo para a mesma mensagem, no mesmo processo; a reexecução recomeça o documento sem novo `attempt`. Esgotada, a mensagem vai para a DLQ e o documento para `failed` com `document.processing_error` ([eventos-kafka](eventos-kafka.md)).

## Pré-condições dos handlers

O Kafka não autentica quem publica ([eventos-kafka](eventos-kafka.md#confiança)). Cada handler relê a linha no PostgreSQL e só age no estado abaixo; em qualquer outro, ou com a linha inexistente, marca a mensagem como processada e termina sem efeito. Dono (`owner_sub`), `storage_key`, coleção e tipo de mídia vêm sempre da linha, nunca do evento.

| Evento | Age somente se |
|---|---|
| `document.uploaded`, `document.retry_requested` | documento em `received`, ou em `extracting`/`ocr` (interrupção ou reexecução, passo 1 abaixo) |
| `document.deletion_requested` | documento em `deleting` |
| `collection.deletion_requested` | coleção em `deleting` |
| `document.processed` | nunca no M2; o M3 define a regra da indexação |

## Processamento no Worker

1. Handlers de `document.uploaded` e `document.retry_requested` carregam o documento por id (leitura sem filtro de dono, exclusiva do Worker); dono, `storage_key` e tipo vêm dessa linha. Inexistente, `ready`, `failed` ou `deleting`: marca a mensagem como processada e termina. `extracting` ou `ocr` na reexecução do mesmo handler: recomeça sem novo `attempt`. `extracting` ou `ocr` na primeira execução: interrupção anterior, reinicia ou falha pela regra de `attempt`.
2. Início, em transação: `extracting`, `attempt + 1`, páginas anteriores apagadas, passos atualizados.
3. O objeto é copiado do S3 para um arquivo temporário em `/tmp`, apagado ao final.
4. Extração por tipo:

| Tipo | Regra |
|---|---|
| PDF | camada de texto por página (PdfPig). Protegido por senha: `document.encrypted`. Ilegível ou sem páginas: `document.corrupted`. Mais de `Documents__MaxPages` páginas: `document.too_many_pages`. Página com menos de 20 caracteres não brancos vai para OCR. |
| PNG, JPEG, WebP | uma página, sempre OCR |
| TXT, MD | UTF-8 estrito, BOM removido (inválido: `document.invalid_encoding`); páginas lógicas de até 10.000 caracteres, cortadas no último `\n` antes do limite ou no limite sem separar pares substitutos; nunca OCR |

5. Texto gravado com `\r\n` e `\r` convertidos em `\n` e sem U+0000 (o PostgreSQL não aceita NUL); `char_count` é o comprimento em unidades UTF-16, a mesma contagem do fatiamento do M3. Em transação: `page_count`, páginas `method = 'text'` e `extraction` = `done`. Sem página pendente, segue para a conclusão com `ocr` = `skipped`; com pendentes, estado `ocr`.
6. OCR: antes de cada chamada ao Gemini, inclusive retentativas, confere o consentimento vigente do `owner_sub` da linha ([consentimento-gemini](consentimento-gemini.md)); ausente ou revogado, não envia mais nenhuma página e grava `failed` com `document.consent_required`. Cada página pendente (a página do PDF isolada ou a imagem) vai ao modelo `Gemini__OcrModel` pelo SDK oficial, com instrução fixa de transcrição literal em texto puro; a resposta é dado, nunca instrução. Página recusada pelo provedor ou sem texto é gravada vazia (`char_count = 0`). Cada página é gravada ao terminar (`method = 'ocr'`) e `updated_at` é renovado pelo menos a cada 60 s. A chave reserva só é usada depois de 401/403 da principal, nunca para contornar cota. OCR sequencial por documento; não há fallback P7 no M2.
7. Conclusão, em transação: nenhum caractere não branco no documento dá `failed` com `document.no_text`; senão `ready`, passo corrente `done` e outbox `document.processed` (`documentId`, `pageCount`). A marca no inbox entra nesta transação.
8. Falha permanente do catálogo, ou transitória que esgotou as tentativas: transação com `failed`, código e mensagem do catálogo, passo corrente `failed` e marca no inbox. Exceção inesperada que esgotou as reexecuções: DLQ e, no melhor esforço, `failed` com `document.processing_error`; se nem isso for gravado, a varredura recupera o documento.

## Exclusão

- **Documento** (`document.deletion_requested`, só com a linha em `deleting`): apaga o objeto pela `storage_key` da linha (ausente conta como sucesso), no M3 também trechos e vetores em toda coleção de perfil, e então a linha (páginas e passos em cascata) com a marca no inbox na mesma transação. Documento inexistente encerra sem erro.
- **Coleção** (`collection.deletion_requested`, só com a coleção em `deleting`): marca como `deleting` documentos da coleção que ainda não estejam (corrida com upload), exclui cada documento como acima, uma transação por documento, e por último a coleção. A chave estrangeira impede apagar a coleção enquanto restar documento; a mensagem é repetida até concluir.
- Nada é arquivado. Depois da exclusão o id responde 404 e citações antigas (M3) exibem "documento removido".

## Recuperação

Varredura do Worker a cada 60 s:

| Situação | Ação |
|---|---|
| `received` sem alteração há 60 min | outbox `document.retry_requested` com `trigger = "recovery"` |
| `extracting` ou `ocr` sem renovação há 15 min | idem; o handler reinicia ou falha pela regra de `attempt` |
| documento em `deleting` há 15 min | outbox `document.deletion_requested` |
| coleção em `deleting` há 15 min | outbox `collection.deletion_requested` |

A varredura atualiza `updated_at` e `version` na mesma transação do outbox, para não repetir a cada ciclo. Eventos repetidos são inofensivos: o handler decide pelo estado atual e o inbox descarta duplicatas.

## Coleção e consentimento

- Coleção: `active` → `deleting` → removida. Só `active` aceita documentos novos.
- Consentimento: aceite por versão do aviso e revogação, em [consentimento-gemini](consentimento-gemini.md).
