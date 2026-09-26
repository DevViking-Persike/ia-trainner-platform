# Conversar com histórico salvo

O chat em `/app/chat` usa a sessão autenticada do navegador, a API .NET e os modelos instalados na infraestrutura. As novas conversas ficam no MongoDB, isoladas por usuário. O navegador não recebe endereço interno, chave de provedor ou credencial de banco.

1. Entre na plataforma e abra o chat.
2. Selecione um modelo disponível e crie uma conversa. O primeiro modelo habilitado é `qwen3.5:9b`.
3. Envie a pergunta e aguarde a resposta; a primeira geração pode carregar o modelo.
4. Retome uma conversa pela lista ou recarregue a URL selecionada para recuperar o histórico. A exclusão pede confirmação.

Pergunta e resposta são gravadas juntas após uma geração válida. Cancelamento ou falha de transporte provoca uma releitura; a chave idempotente evita duplicação numa nova tentativa. A indisponibilidade do modelo não deve impedir a leitura do histórico salvo.

Mensagens do laboratório antigo nunca foram gravadas e não são migradas automaticamente. O chat persistente ainda não consulta documentos, não faz RAG/citações e não cria modelos treinados. O catálogo lista apenas modelos permitidos e instalados, sem baixá-los.

## Contrato

- `GET /api/chat/models`: modelos disponíveis, contexto, limite de saída e limites de transporte.
- `GET/POST /api/conversations`, `GET/DELETE /api/conversations/{id}`, `POST /api/conversations/{id}/messages`: histórico persistente; contrato em [conversas](../contracts/m3/conversas.md).
- `POST /api/chat/test` permanece como endpoint de diagnóstico sem persistência; a interface nova usa os endpoints de conversas.
- Somente sessões/tokens autorizados pelo projeto; cookies continuam protegidos por CSRF e mesma origem.
- O contexto da geração é configurável em tokens e reserva espaço para a resposta. A API seleciona pares recentes por uma estimativa conservadora; o histórico completo continua no MongoDB. A resposta informa tokens efetivamente medidos pelo Ollama, mensagens incluídas/omitidas e saída interrompida pelo limite.
- Teto de armazenamento de 1.000 mensagens/4 MiB de texto por conversa; teto de transporte de 32.768 caracteres por mensagem, sujeito ao orçamento de contexto. Não são limites nativos do modelo. O servidor não aceita instruções de sistema, ferramentas ou URLs de provedor vindas do navegador.
- Uma geração por instância da API, sem fila, e até 12 pedidos por usuário por minuto. A API atual tem uma réplica. Isso limita o laboratório; não implementa reserva exclusiva de GPU para treinamentos.
- Timeout de catálogo em 10 segundos e de geração em 120 segundos; cancelamento propagado ao transporte. Falhas são respostas `problem+json`, sem conteúdo do provedor ou segredos.
- Respostas como texto puro; prompts e respostas não são gravados nos logs. OpenTelemetry registra as chamadas HTTP sem conteúdo das mensagens.

## Configuração e ativação

`Chat__Enabled`, `Chat__BaseUrl`, `Chat__Models`, `Chat__ContextTokens` e `Chat__MaxOutputTokens` ficam no Infisical `dev /ia-trainner/backend`. A persistência usa `Conversations__Enabled`, `Conversations__ConnectionString` e `Conversations__Database` no mesmo escopo. Sem configuração válida, o recurso falha fechado; não há fallback para histórico em memória. A configuração privada não é compilada no Angular.

MongoDB: `ia_trainner.conversations`, identidade de aplicação limitada a CRUD nesta coleção, schema/índice no repositório DDL e políticas de rede específicas no `infra-k8s`. Os spans OpenTelemetry MongoDB identificam somente sistema, database, coleção e operação; sem mensagens, títulos, proprietário ou query.

Benchmark sintético da P7 (RTX 3060 de 12 GB, `qwen3.5:9b`): contextos 8k/16k/32k permaneceram inteiramente na GPU. Com 32.768 de contexto, 27.745 tokens de entrada e 763 de saída levaram 25,5 s e atingiram pico observado de 7.447 MiB de VRAM. A configuração escolhida é 32.768/1.024; isso não altera o contexto nativo declarado pelo modelo. A [documentação do Ollama](https://docs.ollama.com/context-length) descreve a relação entre contexto, memória e uso de CPU/GPU.

`Documents__Enabled=false` permite publicar o laboratório mantendo documentos e consentimento Gemini fechados até finalizar o aviso. Essa chave controla a entrada HTTP de documentos; não é um botão para interromper trabalhos já aceitos pelo Worker. Sua ativação deve seguir os critérios M2 e a versão correta do consentimento.

## Migração do Svelte

| Fluxo | Situação na implementação Angular/.NET |
|---|---|
| Login e área autenticada | Publicados; login confirmado pelo titular |
| Cadastro, e-mail e recuperação | Implementados; aceitação completa no ambiente ainda pendente |
| Documentos e coleções | Implementados e testados; ativação depende do aviso Gemini |
| Chat com modelo instalado e histórico persistente | Angular → .NET → MongoDB/Ollama; evidência de publicação em development-status |
| RAG com fontes documentais | Pendente, restante do marco M3 |
| Treinamento, agenda, artefatos e consumo de modelo treinado | Pendentes, marco M4 |
| Gestão completa de modelos, equipes e monitoramento de servidor | Ainda não migrados |

As telas Svelte usam uma combinação de adaptadores Tauri e repositórios simulados. Sua existência não comprova integração web. Esta migração verifica cada fluxo completo, em vez de assumir paridade apenas por haver uma tela equivalente.
