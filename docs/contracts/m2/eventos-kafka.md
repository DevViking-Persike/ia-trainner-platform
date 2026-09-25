# Eventos Kafka dos documentos

Origem: C-M2-EVENTS. O Kafka transporta eventos; o estado fica no PostgreSQL, e o outbox e o inbox são a camada de durabilidade ([ADR-0009](../../adrs/ADR-0009-documentos-assincronos.md)).

## Tópicos

| Tópico | Partições | Uso |
|---|---|---|
| `ia-trainner.documents.v1` | 1 | eventos de documentos e coleções; o M3 acrescenta os de indexação |
| `ia-trainner.documents.dlq.v1` | 1 | mensagens que esgotaram as tentativas |

Broker `kafka.dados.svc.cluster.local:9092`: único, PLAINTEXT, sem criação automática de tópicos. O `infra-k8s` cria os dois tópicos antes do Worker, com fator de replicação 1; o principal usa a retenção do cluster (24 h / 512 MiB) e a DLQ tem proposta de 7 dias. A chave da mensagem é o `aggregateId` em texto, o que preserva a ordem por agregado se houver mais partições no futuro. Nomes de tópico são constantes de código, não configuração.

## Envelope

Valor em JSON UTF-8:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `messageId` | uuid | id único, igual a `outbox_messages.id`; chave de deduplicação no inbox |
| `type` | string | tipo do evento |
| `schemaVersion` | integer | `1` |
| `aggregateId` | uuid | documento ou coleção |
| `aggregateVersion` | integer | `version` do agregado depois da mudança (diagnóstico; handlers decidem pelo estado atual) |
| `ownerSub` | string | dono do agregado, copiado da linha; o Worker só o confere, nunca decide por ele ([confiança](#confiança)) |
| `organizationId` | string \| null | organização do dono |
| `occurredAt` | instante | momento da mudança |
| `data` | objeto | dados do tipo |

Cabeçalhos: `traceparent` e, se houver, `tracestate` (W3C), e `content-type: application/json`. Nunca vão no evento: nome de arquivo, texto, chave de objeto S3, token, credencial ou URL assinada.

## Tipos

| `type` | `data` | Produtor | Consumidor |
|---|---|---|---|
| `document.uploaded` | `{"documentId"}` | API, no upload | Worker: processamento |
| `document.retry_requested` | `{"documentId", "trigger": "user"\|"recovery"}` | API no retry; Worker na varredura | Worker: processamento |
| `document.deletion_requested` | `{"documentId"}` | API no DELETE; Worker na varredura | Worker: exclusão |
| `collection.deletion_requested` | `{"collectionId"}` | API no DELETE da coleção; Worker na varredura | Worker: exclusão em cascata |
| `document.processed` | `{"documentId", "pageCount"}` | Worker, ao chegar a `ready` | M3: indexação; ignorado no M2 |
| `document.indexed`, `document.index_failed` | reservados para o M3 | — | — |

```json
{
  "messageId": "0192f5c4-8e1a-7c3b-9d2e-000000000001",
  "type": "document.uploaded",
  "schemaVersion": 1,
  "aggregateId": "0192f5c4-8e1a-7c3b-9d2e-5a6b7c8d9e0f",
  "aggregateVersion": 0,
  "ownerSub": "000000000000000001",
  "organizationId": null,
  "occurredAt": "2026-09-25T12:00:00+00:00",
  "data": { "documentId": "0192f5c4-8e1a-7c3b-9d2e-5a6b7c8d9e0f" }
}
```

## Confiança

O broker não autentica clientes: qualquer pod com `kafka-client: "true"`, em qualquer namespace, e o usuário do Kafka UI podem publicar nos tópicos. Por isso todo evento é só um aviso de que pode haver trabalho:

- O handler relê o agregado no PostgreSQL e só age se o estado atual pedir aquele trabalho ([pré-condições](ciclo-de-vida-documento.md#pré-condições-dos-handlers)); fora delas, ou com o agregado inexistente, marca a mensagem como processada e termina sem efeito.
- Dono (`owner_sub`), `storage_key`, coleção e tipo de mídia vêm sempre da linha. Do evento o Worker usa só `messageId`, `type`, `schemaVersion`, o id em `data` (igual a `aggregateId`; divergente, a mensagem é ilegível) e o contexto de trace; os demais campos são diagnóstico.
- `ownerSub` diferente do `owner_sub` da linha: aviso no log (`messageId`, `type` e `aggregateId`, sem os valores), mensagem confirmada sem efeito e sem marca no inbox; se o estado ainda pedir trabalho, a varredura reemite o evento.

Assim, um evento forjado no máximo antecipa trabalho que o banco já pede. Recomendado ao `infra-k8s`, sem bloquear o M2: Kafka UI somente leitura (hoje o usuário da UI administra tópicos e mensagens) e, quando o broker tiver autenticação, escrita nos tópicos `ia-trainner.*` só para o Worker.

## Publicação pelo outbox

- API e Worker gravam o evento em `outbox_messages` na mesma transação da mudança de estado: `payload` é o envelope completo e `headers` guarda o contexto de trace da operação.
- O relay roda no Worker: a cada 1 s lê até 100 pendentes em ordem de `occurred_at, id` com `FOR UPDATE SKIP LOCKED`, publica com `acks=all` e produtor idempotente e grava `published_at` depois do ack.
- Falha na publicação: `attempts + 1`, `last_error` com tipo e código do erro (sem conteúdo) e nova tentativa no ciclo seguinte.
- Queda entre o ack e `published_at` republica com o mesmo `messageId`; o inbox descarta a duplicata.
- Uma limpeza diária apaga linhas publicadas há mais de 7 dias.

## Consumo

- Grupo `ia-trainner-worker.documents`, `enable.auto.commit=false`, `auto.offset.reset=earliest`. O offset só é confirmado depois do handler ou do envio à DLQ.
- Processamento longo: o consumidor pausa a partição e continua chamando `Consume`, para não passar de `max.poll.interval.ms`; retoma e confirma ao terminar.
- Idempotência: `IInboxStore.TryMarkProcessedAsync("ia-trainner-worker.documents", messageId)` entra na transação final do handler; mensagem já marcada é confirmada sem efeito. Os handlers decidem pelo estado atual ([ciclo-de-vida-documento](ciclo-de-vida-documento.md)).
- Falha transitória numa operação (Gemini, S3, PostgreSQL): até 5 execuções da operação, com espera exponencial de 2, 4, 8 e 16 s (±20%), respeitando `Retry-After` do provedor até 60 s. Esgotadas, o handler grava `failed` com o código da causa e `retryable = true` e a mensagem é confirmada; não vai para a DLQ, porque o resultado ficou registrado.
- Exceção não tratada no handler: o consumidor o reexecuta para a mesma mensagem até 5 vezes no total, com a mesma espera, informando o número da execução (reexecução não conta novo `attempt`). Esgotadas: mensagem na DLQ, documento em `failed` com `document.processing_error` no melhor esforço, offset confirmado.
- Mensagem ilegível ou `schemaVersion` não suportada de tipo conhecido vai direto para a DLQ (e o documento, se identificável e em `extracting` ou `ocr`, para `failed` com `document.processing_error`). Tipo desconhecido é confirmado e registrado em log, para compatibilidade futura.
- DLQ: mesma chave e valor; cabeçalhos originais mais `x-dlq-reason` (código do erro), `x-dlq-exception` (só o nome do tipo), `x-dlq-original-topic`, `x-dlq-original-partition`, `x-dlq-original-offset`, `x-dlq-attempts` e `x-dlq-failed-at`. O reenvio manual republica a mensagem original com o mesmo `messageId`.
- Uma limpeza diária apaga do inbox as linhas processadas há mais de 7 dias (a retenção do tópico é de 24 h).

## Rastreamento

`POST /api/documents` (span HTTP) → `outbox_messages.headers` → span do relay `ia-trainner.documents.v1 publish`, filho do contexto gravado → cabeçalhos Kafka → span do Worker `ia-trainner.documents.v1 process`, filho do cabeçalho → spans de S3, PostgreSQL e Gemini. O mesmo trace id liga a requisição ao processamento no Jaeger. Atributos: `messaging.system=kafka`, `messaging.destination.name`, `messaging.message.id`, `ia_trainner.event_type`, `ia_trainner.document_id`. Nunca `ownerSub`, nome de arquivo ou texto em spans e logs.
