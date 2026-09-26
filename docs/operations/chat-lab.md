# Testar o chat

O laboratório em `/app/chat` permite testar um modelo já instalado na infraestrutura da plataforma. Ele usa a sessão autenticada do navegador e encaminha pedidos pela API .NET. O navegador não recebe endereço interno, chave de provedor ou credencial de infraestrutura.

1. Entre na plataforma e abra **Testar chat**.
2. Selecione um modelo no catálogo disponível. A primeira liberação usa `qwen3.5:9b`.
3. Envie uma pergunta curta e aguarde a resposta. O primeiro pedido pode levar mais tempo para carregar o modelo.
4. Continue a conversa, cancele a espera ou limpe a conversa para começar outro teste.

A conversa existe apenas na memória da página e se perde ao sair ou recarregar. Não há salvamento de histórico, acesso aos documentos enviados, busca RAG, citações ou criação de um modelo treinado neste laboratório. A seleção se limita aos modelos permitidos pelo servidor e realmente instalados. O catálogo não baixa modelos.

## Contrato

- `GET /api/chat/models`: modelos disponíveis e limites de entrada.
- `POST /api/chat/test`: `{model, messages: [{role, text}]}`; resposta `{model, text}`.
- Somente sessões/tokens autorizados pelo projeto; cookies continuam protegidos por CSRF e mesma origem.
- Até 20 mensagens, 4.000 caracteres por mensagem e 16.000 caracteres no pedido. Os turnos alternam usuário/assistente, começando e terminando com usuário. O servidor não aceita instruções de sistema, ferramentas ou URLs de provedor vindas do navegador.
- Uma geração por instância da API, sem fila, e até 12 pedidos por usuário por minuto. A API atual tem uma réplica. Isso limita o laboratório; não implementa reserva exclusiva de GPU para treinamentos.
- Timeout de catálogo em 10 segundos e de geração em 120 segundos; cancelamento propagado ao transporte. Falhas são respostas `problem+json`, sem conteúdo do provedor ou segredos.
- Respostas como texto puro; prompts e respostas não são gravados nos logs. OpenTelemetry registra as chamadas HTTP sem conteúdo das mensagens.

## Configuração e ativação

`Chat__Enabled`, `Chat__BaseUrl` e `Chat__Models` ficam no Infisical `dev /ia-trainner/backend`. Sem configuração válida, o chat responde 503 e sua capacidade aparece indisponível. A configuração não é compilada no Angular. A saída da API para o serviço de inferência fica em uma NetworkPolicy própria no `infra-k8s`.

`Documents__Enabled=false` permite publicar o laboratório mantendo documentos e consentimento Gemini fechados até finalizar o aviso. Essa chave controla a entrada HTTP de documentos; não é um botão para interromper trabalhos já aceitos pelo Worker. Sua ativação deve seguir os critérios M2 e a versão correta do consentimento.

## Migração do Svelte

| Fluxo | Situação na implementação Angular/.NET |
|---|---|
| Login e área autenticada | Publicados; login confirmado pelo titular |
| Cadastro, e-mail e recuperação | Implementados; aceitação completa no ambiente ainda pendente |
| Documentos e coleções | Implementados e testados; ativação depende do aviso Gemini |
| Laboratório de chat com modelo instalado | Fluxo próprio Angular → .NET → inferência local |
| Conversas persistentes e RAG com fontes | Pendentes, marco M3 |
| Treinamento, agenda, artefatos e consumo de modelo treinado | Pendentes, marco M4 |
| Gestão completa de modelos, equipes e monitoramento de servidor | Ainda não migrados |

As telas Svelte usam uma combinação de adaptadores Tauri e repositórios simulados. Sua existência não comprova integração web. Esta migração verifica cada fluxo completo, em vez de assumir paridade apenas por haver uma tela equivalente.
