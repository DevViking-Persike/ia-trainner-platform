# Conversas persistentes

O Angular mantém a seleção na URL e carrega o histórico pela API .NET. O MongoDB guarda as conversas em `ia_trainner.conversations`, com proprietário obtido exclusivamente da sessão/claim `sub`. Todas as operações incluem esse proprietário; um identificador pertencente a outro usuário retorna 404.

## HTTP

| Método e rota | Entrada | Resultado |
|---|---|---|
| GET `/api/conversations` | — | `{items: [...]}`, até 100 resumos recentes |
| POST `/api/conversations` | `{model}` | Nova conversa vazia |
| GET `/api/conversations/{id}` | UUID | Histórico completo e último consumo de tokens |
| POST `/api/conversations/{id}/messages` | `{text, clientMessageId, expectedVersion}` | Histórico depois de registrar o par pergunta/resposta |
| DELETE `/api/conversations/{id}` | UUID | Exclusão definitiva, 204 |

O resumo contém `id`, `title`, `model`, `createdAt`, `updatedAt`, `version` e `messageCount`. O detalhe contém os mesmos campos de identificação, `messages` com `id`, `role`, `text`, `createdAt`, e `lastUsage`. O modelo é escolhido na criação e permanece fixo na conversa.

`clientMessageId` identifica uma tentativa lógica. Repetir a mesma chave e conteúdo recupera o resultado salvo sem nova geração. Reutilizá-la com outro conteúdo ou enviar uma versão desatualizada retorna conflito. O armazenamento acrescenta pergunta e resposta numa única atualização condicionada à versão; falha do provedor não grava um turno parcial. Após cancelamento ou falha de transporte, a interface relê o histórico: o servidor pode ter concluído a gravação antes de receber o cancelamento.

## Histórico e contexto

Histórico salvo e contexto do modelo são limites diferentes. A conversa comporta até 1.000 mensagens e 4 MiB de texto UTF-8; são proteções de armazenamento. Cada mensagem tem teto de transporte de 32.768 caracteres, sujeito também ao orçamento de contexto disponível. Uma pergunta que ultrapasse esse orçamento é rejeitada integralmente.

Para gerar a próxima resposta, o backend seleciona a pergunta atual e os pares mais recentes que couberem no orçamento. Mensagens antigas continuam no MongoDB. A estimativa prévia é conservadora, calculada a partir de bytes UTF-8 com margem para o template e reserva de saída; não é apresentada como tokenização exata. Os contadores `inputTokens` e `outputTokens` são os medidos pelo Ollama após a geração. `includedMessages`/`omittedMessages` informam o recorte enviado, e `outputTruncated` informa que a geração atingiu o limite de saída.

`Chat__ContextTokens` e `Chat__MaxOutputTokens` são configurados no Infisical. O teste na P7 aprovou 32.768/1.024 para `qwen3.5:9b`; não altera o limite nativo do modelo. Conversas salvas continuam disponíveis independentemente da janela de contexto.

## Operação

O schema e os índices são versionados em `ia-trainner-sql-ddl/mongodb`; a identidade restrita e a política de rede ficam em `infra-k8s`. `Conversations__ConnectionString`, `Conversations__Database` e `Conversations__Enabled` pertencem somente ao escopo da API no Infisical. A conta runtime tem CRUD apenas na coleção de conversas. Falta ou falha de configuração retorna indisponibilidade; não há substituição por armazenamento em memória.

Esse fluxo ainda não consulta documentos nem gera embeddings. Essas capacidades exigem o processamento documental e o consentimento Gemini vigentes. Não registrar textos, títulos, credenciais ou consultas MongoDB em logs/traces.
