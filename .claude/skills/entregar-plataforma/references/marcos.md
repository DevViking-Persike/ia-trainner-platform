# Marcos e critérios de aceite

O ponto de partida documentado em 25/09/2026 é uma página Angular de migração publicada, backend .NET básico e CLI Python existente. Confirme o código atual antes de usar esse diagnóstico. Leia apenas o marco em execução e os pré-requisitos relevantes.

## M1 — acesso

**Resultado:** o usuário abre o domínio, clica em **Entrar**, autentica no ZITADEL, acessa uma área interna e recebe uma resposta real da API .NET com seu contexto autorizado.

Implementação:

- Substituir a ambiguidade do rótulo “Nova plataforma” por estado informativo e um controle de entrada funcional. Criar rotas da página inicial, callback, área autenticada, acesso negado e página não encontrada.
- Configurar uma aplicação SPA no projeto ZITADEL apropriado, com callbacks e logout URLs exatos para o domínio e para desenvolvimento quando necessário. Obter os identificadores reais e configurar a audience da API corretamente. Usar biblioteca OIDC mantida com discovery/PKCE/state/nonce; não escrever um protocolo próprio.
- Tratar retorno do login, cancelamento, expiração de sessão, logout e retorno a uma rota local permitida. Não enviar tokens a destinos arbitrários nem registrar tokens/claims pessoais em logs públicos.
- Integrar Angular à API com o access token adequado; validação de issuer, audience, assinatura e validade no servidor. Guards da SPA são conveniência de navegação, não controle de acesso suficiente.
- Entregar endpoint de contexto do usuário autenticado com dados mínimos, e uma tela que o consuma. Mostrar estados reais de carregamento/erro e identificar recursos ainda indisponíveis. Não criar métricas fictícias para preencher o dashboard.
- Publicar API no H6 usando os manifests e pipeline existentes, Infisical, OIDC de CI e Argo. Preferir mesma origem com `/api` para a API, preservando os caminhos do backend; definir rota própria de saúde da API. Adaptar CORS somente se a topologia exigir.
- Confirmar exportação OTel e contexto de uma requisição de teste até o coletor/Grafana existente; falha de observabilidade deve ficar explícita, sem confundi-la com funcionamento do login.

Aceite:

- Entrada e callback reais no domínio com uma conta autorizada; logout e sessão expirada têm comportamento correto.
- Acesso direto à rota privada sem sessão encaminha ao login. A API rejeita token ausente, expirado, assinatura inválida e audience errada; recurso não autorizado retorna 403 ou resposta equivalente sem vazamento.
- Refresh da rota interna funciona; `/api` devolve a resposta JSON esperada, sem cair no fallback HTML do Angular.
- Não há segredo no bundle, no commit ou nos logs. Testes/build, Actions, Argo e revisões dos dois serviços conferidos.

Se não for possível testar login real por falta de interação do titular da conta, registrar M1 como pendente dessa verificação, não como entregue.

## M2 — documentos

**Pré-requisito:** M1. **Resultado:** usuário envia documento, acompanha processamento, encontra-o ao recarregar e só acessa os próprios recursos autorizados.

- Persistir metadados, proprietário/contexto de acesso, status e outbox no PostgreSQL; arquivo no S3/RustFS. Criar credenciais próprias de aplicação, migrações e limites de tamanho/tipos.
- Processar assíncrono com Kafka e Worker .NET; transação de estado/outbox, consumidor idempotente, retries limitados, estado de erro e recuperação após reinício. Não usar Kafka como armazenamento definitivo de status.
- Extrair diretamente texto de PDFs com camada textual; OCR/extração multimodal Gemini para digitalizações/imagens. Validar tipos, limites e respostas; tratar páginas, referências e falhas. Não pressupor que qualquer PDF precisa de OCR.
- Mostrar upload, lista, detalhe, progresso, erro acionável e exclusão coerente com persistência/arquivos/índices. Testar isolamento também em downloads e jobs, não só na listagem.

Aceite: fixtures sintéticas de PDF textual, PDF digitalizado e imagem; persistência após reinício; mensagem duplicada não duplica documento/processamento; usuário sem permissão não consegue listar/baixar/apagar o documento de outro; falha do provedor fica visível e recuperável; UI e pipeline publicados e verificados.

## M3 — conhecimento e conversas

**Pré-requisito:** M2. **Resultado:** o usuário pergunta sobre documentos autorizados e recebe resposta com fontes verificáveis; a conversa persiste.

- Gerar embeddings Gemini pelo SDK oficial e guardar vetores/payloads no Qdrant. Fixar perfil com provedor, modelo, dimensão, normalização/task type e versão. Verificar modelos atuais disponíveis; não inventar identificadores ou capacidades.
- Usar índices/coleções separados quando o perfil mudar. Fallback local na P7 não pode consultar ou acrescentar vetores incompatíveis ao índice Gemini. Tornar a indisponibilidade explícita quando não houver índice compatível.
- Implementar recuperação com filtros de autorização e citações para documento/página/trecho reais. Documentos recuperados são conteúdo não confiável, nunca instruções do sistema nem autorização para executar ferramentas.
- Integrar chat .NET por portas; considerar `IChatClient`/`IEmbeddingGenerator` quando o adaptador disponível servir ao contrato. MongoDB guarda conversas com autorização; Redis só onde cache trouxer benefício, com chaves isoladas e invalidação.
- No Angular: escolher escopo documental, enviar pergunta, acompanhar resposta, abrir fontes, retomar conversa e tratar cancelamento/erro. Não simular resposta ou streaming.

Aceite: pergunta com evidência retorna fonte correta; pergunta sem evidência informa a limitação; histórico sobrevive a reinício; usuário não recupera trechos/conversas de outro; teste de indisponibilidade não mistura espaços vetoriais; traces correlacionam requisição, recuperação e provedor sem registrar conteúdo sensível.

## M4 — treinamento e consumo do modelo

**Pré-requisitos:** M1 e persistência/artefatos/eventos necessários do M2. M3 não é obrigatório para implementar o executor, mas faz parte da entrega `completo`.

**Resultado:** usuário cadastra/valida dataset, agenda um treinamento, acompanha um Job real na P7 e consegue avaliar e selecionar a versão resultante para inferência.

- Inspecionar modelos reais da P7, formatos, licenças, pesos treináveis acessíveis, disco e VRAM disponível. Um modelo quantizado servido pelo Ollama não é automaticamente um checkpoint de treino. Selecionar candidato conservador e validar LoRA/QLoRA com smoke curto; não prometer que 7B/8B cabe só pelo tamanho nominal.
- Validar dataset pelo CLI existente. Estender `finetuning`/configs/factories; não criar scripts paralelos nem modificar `llama.cpp/`. Artefatos e datasets permanecem privados fora do Git.
- PostgreSQL guarda trabalho, agenda e estado; considerar timezone `America/Sao_Paulo`, persistindo instantes UTC. O agendador publica eventos elegíveis pelo outbox/Kafka. Não deixar consumidores dormindo até a janela futura.
- Executor .NET cria Jobs Kubernetes com identidade/RBAC limitados, imagem por digest, placement na P7, `nvidia.com/gpu: 1`, timeouts e volumes definidos. Restringir mounts, comandos e imagens; entradas do usuário não viram comandos shell arbitrários.
- Exclusão durável da GPU entre Ollama e treino. Respeitar a janela incluindo tempo de preparação e recuperação; drenar/pausar inferência, confirmar liberação da GPU e só então iniciar. Registrar/reconciliar estado para restaurar inferência após sucesso, falha, cancelamento, crash ou perda do Worker; não depender apenas de `finally` em memória.
- Definir transições explícitas, idempotência de mensagens/Jobs, retries limitados, cancelamento e recuperação. CI publica imagem/catálogo; publicação não inicia treinamento nem reserva a GPU.
- Registrar métricas de avaliação, linhagem do dataset/modelo, configuração, versão e localização dos artefatos. Comparar candidato com base; promover explicitamente após critérios de qualidade e manter rollback. Inferência .NET deve consumir a versão efetivamente registrada, sem nomes fictícios.
- Mostrar no Angular dataset, janela, status persistido, progresso/métricas, falha, cancelamento, artefatos e versão selecionada. Instrumentar .NET/Python e propagação W3C HTTP/Kafka até o Grafana.

Aceite: smoke real em janela autorizada na P7; GPU exclusiva; mensagem duplicada não inicia outro treino; reinício do executor não perde trabalho; falha/cancelamento libera GPU e recupera inferência; artefato versionado pode ser avaliado e consumido em inferência. Testes CPU ou imagem Docker construída não substituem a validação GPU. Se ela não couber na janela disponível, registrar exatamente o teste pendente e não forçar interrupção da inferência fora da janela.
