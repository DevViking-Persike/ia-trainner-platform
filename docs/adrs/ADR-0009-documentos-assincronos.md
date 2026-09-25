# ADR-0009 — Processamento assíncrono de documentos com outbox, Kafka e inbox

## Status
Aceito

## Data
2026-09-25

## Contexto
No M2 o usuário envia PDFs, imagens e textos de até 50 MiB. Extrair a camada de texto é rápido, mas o OCR pelo Gemini leva segundos por página, depende de cota e rede e pode falhar de forma transitória. O processamento precisa sobreviver a reinícios da API e do Worker, não duplicar documentos nem páginas quando uma mensagem se repete, mostrar o estado real na interface e permitir recuperação. A exclusão, por decisão do titular, é definitiva e em cascata assíncrona (metadados, arquivo e, no M3, trechos e vetores).

O Kafka disponível (`kafka.dados.svc.cluster.local:9092`) é um broker único, PLAINTEXT, com retenção de 24 h / 512 MiB e sem criação automática de tópicos: não serve como armazenamento de estado nem garante reprocessamento depois da retenção. A arquitetura da plataforma já define PostgreSQL com outbox para estado durável e Kafka para integração entre processos na mesma solução.

## Decisão
- **Estado no PostgreSQL.** `documents.status` é a única fonte de estado (`received`, `extracting`, `ocr`, `ready`, `failed`, `deleting`), com transições aplicadas pelo agregado do Domain e concorrência otimista por `version`. O Kafka só transporta eventos.
- **Outbox transacional.** Toda mudança de estado que dispara trabalho grava o evento em `outbox_messages` na mesma transação. O relay no Worker publica em `ia-trainner.documents.v1` (chave = id do agregado) e marca `published_at` depois do ack.
- **Consumo idempotente.** O Worker consome no grupo `ia-trainner-worker.documents`, confirma o offset só ao terminar e grava o `messageId` em `inbox_processed_messages` na transação final do handler. Handlers decidem pelo estado atual do agregado, de modo que duplicatas, reentregas e eventos fora de ordem são inofensivos. Como o broker não autentica clientes, o evento é só um aviso: cada handler exige o estado que pede o trabalho (exclusão só em `deleting`) e lê dono e chave do objeto do banco, nunca da mensagem.
- **Falhas.** Falha transitória de uma operação (Gemini, S3, PostgreSQL) é repetida em até 5 execuções com espera exponencial; esgotada, o documento vai a `failed` com código estável e `retryable = true`, e o usuário pode pedir reprocessamento. Exceção inesperada reexecuta o handler; esgotada, a mensagem vai para `ia-trainner.documents.dlq.v1`. Falha permanente (sem texto, arquivo corrompido, PDF protegido, limite de páginas, codificação) vai a `failed` sem reprocessamento. Interrupções reiniciam o processamento até `Documents__MaxAttempts` vezes.
- **Recuperação.** Uma varredura do Worker reenfileira pelo outbox documentos parados (`received` há 60 min, `extracting`/`ocr` sem renovação há 15 min, `deleting` há 15 min) e coleções em exclusão. Isso cobre perda de mensagens pela retenção curta e quedas longas do Worker.
- **Exclusão.** A API marca `deleting` (o recurso some das respostas na hora) e emite o evento na mesma transação; o Worker apaga o objeto S3, (M3) trechos e vetores, e por fim as linhas. Nada é arquivado.
- **Gemini com consentimento.** Upload e reprocessamento exigem consentimento vigente do usuário ao aviso versionado, e o Worker confere de novo antes de cada chamada ao Gemini, pelo dono gravado no documento; revogado no meio do OCR, as páginas restantes não são enviadas. Não há fallback P7 para OCR no M2.
- **Rastreamento.** O contexto W3C da requisição é guardado com o evento no outbox e propagado nos cabeçalhos Kafka, ligando upload, publicação e processamento no mesmo trace.
- Contratos: [ciclo-de-vida-documento](../contracts/m2/ciclo-de-vida-documento.md), [eventos-kafka](../contracts/m2/eventos-kafka.md), [consentimento-gemini](../contracts/m2/consentimento-gemini.md) e [banco-de-dados](../contracts/m2/banco-de-dados.md).

## Alternativas consideradas
- Processar dentro da requisição HTTP (como o legado Go) — tempo de resposta imprevisível, sem retentativa nem recuperação após queda, e a API teria de falar com o Gemini.
- Publicar no Kafka direto da API, sem outbox — escrita dupla: commit sem evento ou evento sem commit.
- Kafka como fonte de estado (event sourcing) — retenção de 24 h e broker único não oferecem durabilidade.
- Fila só no PostgreSQL (`SELECT ... FOR UPDATE SKIP LOCKED`), sem Kafka — funcionaria nesta escala, mas a plataforma já adotou Kafka para integração, e M3 (indexação) e M4 (treinamento) reutilizam o mesmo transporte, relay e consumidor.
- RabbitMQ ou filas em memória do legado — fora da arquitetura atual; filas em memória perdem trabalho.

## Consequências
- Ganhos: upload responde rápido (202) e o estado persiste entre reinícios; mensagens repetidas não duplicam nada; falhas ficam visíveis e recuperáveis; a exclusão é consistente entre banco e arquivos.
- Trade-offs: consistência eventual (a interface consulta o estado periodicamente); mais peças para operar (relay, varreduras, DLQ); ordem garantida só por agregado.
- Limitações: uma partição e um consumidor processam documentos em sequência, e um PDF longo com OCR atrasa os seguintes; aumentar partições e réplicas fica para quando houver demanda. Os tópicos precisam existir antes do Worker.

## Impacto em código, testes e operação
- Backend: portas `IUnitOfWork`, `IOutbox` e `IInboxStore`; relay e base de consumidor no Worker; handlers de processamento e exclusão; varreduras de recuperação e de objetos órfãos; `ICurrentUser` e repositórios sempre filtrados por dono.
- Testes: Testcontainers com PostgreSQL, Kafka e MinIO para o caminho completo; mensagem entregue duas vezes gera um processamento; Worker derrubado no meio termina sem duplicar nem travar; falha do provedor leva a `failed` reprocessável; isolamento com dois usuários em listagem, download, exclusão e reprocessamento; evento forjado (exclusão de coleção ativa, `ownerSub` divergente) sem efeito; revogação no meio do OCR interrompe os envios.
- Operação: tópicos principal e DLQ criados pelo `infra-k8s`; Worker com rótulo `kafka-client: "true"` e Secret próprio `ia-trainner-worker`, sem credenciais de sessão, login e e-mail; alertas pela DLQ e por documentos parados; traces no Jaeger ligando requisição, relay e Worker, sem conteúdo de documento em logs.

## ADRs relacionados
- ADR-0007 — Sessão da SPA por BFF .NET com cookie e Redis
- ADR-0008 — Repositórios SQL de DDL e DML, Flyway em PreSync e papéis separados
