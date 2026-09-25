# Avaliação de reaproveitamento dos projetos IA Trainner

> Histórico de avaliação. A decisão posterior adota Angular + .NET + Python. Consulte [arquitetura atual](../architecture/platform.md). As referências a Go/Svelte abaixo descrevem a proposta anterior.

## Recomendação

Usar `ia-trainner-microservice-go` como base de backend para este frontend, integrando os serviços por HTTP e substituindo os mocks gradualmente. Manter os serviços como processos separados. **Decisão do usuário em 25/09/2026: usar ZITADEL como provedor de identidade.** Os projetos de autenticação Keycloak em Go e .NET ficam como referência histórica; o plano atual é integrar OIDC ao ZITADEL e adaptar a validação de tokens dos serviços.

**Decisão complementar:** usar o Kafka existente e janelas de treinamento com pausa temporária da inferência na P7. A proposta atual de Go, Python, GPU e Kubernetes está em [IA na P7 com Kubernetes](../architecture/ai-p7-kubernetes.md). Essa proposta substitui as sugestões iniciais de integração de auth e de execução dos jobs abaixo, preservadas como diagnóstico do código encontrado.

A preferência inicial por Go segue a direção de migração registrada no próprio backend e a existência dos demais serviços nessa linguagem. Não é uma conclusão de benchmark: desempenho, custo e deploy em produção não foram medidos.

## Escopo e evidências

Checkouts locais examinados:

| Projeto | Commit observado | Papel |
|---|---|---|
| `workflows-ia-trainner` | `f773be4` | Frontend SvelteKit/Svelte + Tauri/Rust |
| `ia-trainner-microservice-go` | `8a325b7` | Workspace de seis módulos Go e submódulos |
| `ia-trainner-microservice-keycloak-dotnet` | `06461ab` | Lambda .NET 10 para autenticação via Keycloak |

O backend Go inclui `Frontend` como submódulo. Seus diretórios `src/` e `src-tauri/src/` foram comparados com os deste repositório e são idênticos no estado examinado. Não há ali uma versão mais completa das telas para importar. O submódulo aponta para `DevViking-Persike/ia-trainner`, enquanto este checkout aponta para `DevViking-Persike/workflows-ia-trainner`; é necessário definir o repositório canônico antes de atualizar referências.

Foram lidos código, contratos, configurações de build e documentação, e executadas as suítes existentes. Não foram iniciados serviços de produção, acessados bancos, enviados emails, executados treinos ou realizados deploys. O funcionamento das dependências externas e os endereços atualmente publicados permanecem sem validação.

## O que aproveitar

| Serviço | Implementação encontrada | Aplicação neste frontend | Decisão inicial |
|---|---|---|---|
| `KeycloakServiceGo` | Login, cadastro, refresh, verificação de email, perfil básico e exclusão de conta; Lambda, Keycloak e SMTP | Referência do fluxo antigo | Não integrar como provedor; adotar ZITADEL via OIDC |
| `TrainingServiceGo` | PostgreSQL; jobs, datasets, equipes, modelos, status, chat Ollama, fila e SSE | Dashboard, treinamento, equipes, modelos e chat | Principal integração inicial, começando por leitura |
| `AresChatGo` | Sessões e mensagens persistidas em MongoDB, associadas ao usuário autenticado | Histórico dos chats | Aproveitar; hoje os comandos de histórico do frontend não têm implementação Rust |
| `AresRagGo` | Workspaces, upload, extração de PDF, divisão de texto, embeddings Ollama e busca Qdrant | Coleções, documentos e perguntas RAG | Aproveitar após teste integrado de ingestão e consulta |
| `AresFinetuningGo` | Projetos, datasets, modelos, jobs Redis, publicação RabbitMQ e funções de subprocesso | Pipeline de treino e exportação | Evoluir para Kafka e Jobs Python no Kubernetes; completar execução e isolamento por usuário |
| `AresSharedGo` | Validação JWT/JWKS, logging, métricas, saúde e utilitários HTTP | Infraestrutura interna dos serviços Go | Manter no backend; não portar para TypeScript/Rust |
| Auth .NET | Mesmas oito rotas principais do auth Go, integração real Keycloak/SMTP e testes | Alternativa de autenticação e referência de contratos | Preservar como referência; não integrar duas versões simultaneamente |

## Adaptações de contrato necessárias

| Área | Contrato atual do frontend | Contrato do backend | Adaptação |
|---|---|---|---|
| Login | `{ token, user }` | `{ accessToken, refreshToken, expiresIn, message }` | Definir ciclo de sessão, refresh e obtenção do usuário |
| Cadastro | Retorna usuário e inicia sessão mock | Retorna confirmação e `emailSent`; exige verificação | Separar cadastro de login e completar tela de verificação |
| Perfil | Instituição, plano, créditos, métricas acadêmicas | `/api/auth/me` fornece identidade básica | Definir origem dos campos adicionais; não preencher com valores fictícios |
| Jobs | `nome`, `modelo_base`, status traduzidos, progresso usado como 0–1 | `name`, `baseModel`, status em inglês, eventos de progresso em 0–100 | Mapear campos, estados, unidades e valores derivados |
| Criar treinamento | Formulário e comando atuais não recebem dataset | Backend exige `datasetId` | Adicionar upload/seleção de dataset antes de iniciar |
| Chat de modelo | `model`, `message`, histórico em pares | `POST /api/chat` recebe `model` e `messages`; retorna `content` | Converter histórico e resposta |
| RAG | Coleção identificada por `id`; consulta retorna `ChatMessage[]` | Rotas usam nome do workspace; `/query` retorna `answer` e `sources` | Preservar ID/nome e converter resposta para mensagens/fontes |
| Histórico | Mensagens com `conteudo` e `fontes_utilizadas`; lista simples | `content`, `sources_used`; lista paginada em `{ sessions, total, limit, offset }` | Adaptador de mensagens, paginação e operações HTTP |

Fontes principais: `TrainingServiceGo/internal/handler/dto.go`, `TrainingServiceGo/internal/domain/job.go`, `AresRagGo/internal/handler/dto.go`, `AresChatGo/internal/handler/dto.go`, `KeycloakServiceGo/internal/handler/auth.go`, e os tipos/serviços deste frontend.

## Bloqueadores e limites confirmados

1. **Auth precisa validar tokens recebidos.** `KeycloakServiceGo/internal/handler/auth.go:123` e `middleware.go:22` apenas decodificam o token recebido em `/api/auth/me`. O .NET faz o equivalente em `Function.cs:230`. Não há validação criptográfica nesse caminho de código. É necessário implementá-la ou demonstrar que um authorizer externo a garante; a configuração externa não foi verificada. `AresSharedGo/auth` já oferece validação JWKS para os outros serviços.

2. **Treino pode terminar como sucesso sem executar um modelo.** Em `TrainingServiceGo/internal/training/runner.go:166`, a ausência do script dispara uma simulação; o fluxo superior marca conclusão. Não foi encontrado script Python de treinamento neste workspace. O Dockerfile do serviço também não instala Python nem inclui o script. O ambiente de execução real precisa ser preparado, e a simulação deve ser explícita e restrita a desenvolvimento.

3. **AresFinetuningGo ainda não fecha o fluxo de execução.** `Start` salva o job e publica em RabbitMQ. Existe `RunInProcess`, mas não foi encontrado consumidor da fila nem chamada dessa função no módulo. Um worker externo pode existir fora do escopo examinado e precisa ser localizado ou implementado. Seus endpoints de jobs verificam autenticação, mas não recebem identidade do usuário para filtrar listagem/detalhe; o modelo de job não tem proprietário. Isso precisa ser resolvido antes de uso por equipes/usuários distintos.

4. **Há dois fluxos de treinamento.** `TrainingServiceGo` usa PostgreSQL e fila em memória; `AresFinetuningGo` usa Redis/RabbitMQ. Não foi encontrada integração entre eles. Definir qual serviço controla o estado oficial do job e qual executa GPU antes de oferecer ambos na interface.

5. **Documentação não equivale ao estado executável.** O plano mestre declara migração concluída, enquanto arquivos de progresso ainda marcam etapas pendentes. O README do RAG lista `reindex` e `index-directory`, mas essas rotas não estão registradas em `internal/handler/workspace.go`. Basear a integração nos handlers e testes reais.

6. **O frontend tem seus próprios bloqueios.** Na avaliação anterior desta sessão, `npm run check` encontrou 22 erros e 8 avisos; o build web falhou por pré-renderização de páginas com ações de formulário. O build estático do frontend para Tauri passou, sem comprovar execução nativa. Esses pontos devem ser corrigidos antes do primeiro fluxo integrado.

## Validação executada

Comando Go, a partir da raiz do backend:

```sh
go test -race -json -count=1 -timeout=90s \
  ./AresSharedGo/... ./AresChatGo/... ./TrainingServiceGo/... \
  ./AresRagGo/... ./AresFinetuningGo/... ./KeycloakServiceGo/...
```

| Módulo | Funções de teste aprovadas, sem contar subcasos |
|---|---:|
| AresSharedGo | 72 |
| AresChatGo | 32 |
| TrainingServiceGo | 36 |
| AresRagGo | 2 |
| AresFinetuningGo | 0 — pacotes compilaram, sem arquivos de teste |
| KeycloakServiceGo | 36 |
| **Total Go** | **178** |

Todos os pacotes concluíram sem falhas; o detector de concorrência não reportou problemas nos caminhos exercitados. Os dois testes do RAG são de domínio; não validam a cadeia PostgreSQL/Qdrant/Ollama/PDF. O sucesso das suítes não comprova prontidão para produção.

No projeto .NET:

```sh
dotnet test KeycloakService.Tests/KeycloakService.Tests.csproj --nologo --verbosity minimal
```

Resultado: **65 aprovados, zero falhas, zero ignorados**. Os testes existentes cobrem validadores, tokens auxiliares, roteamento e respostas; não validam login/email reais ponta a ponta.

## Estratégia de integração proposta

Manter este repositório como aplicação cliente e o workspace Go como backend. No modo web atual, os repositórios HTTP do servidor SvelteKit consomem as APIs. No modo Tauri, comandos Rust fazem o transporte HTTP e convertem as respostas para os contratos da interface. Os serviços de banco, modelos e GPU permanecem no servidor.

Para Android/iOS fora da rede local, definir uma API HTTPS alcançável pelo dispositivo. Endereços internos do Kubernetes não bastam. O acesso pode ser centralizado em um gateway; autenticação, refresh, uploads e streaming devem ter um contrato consistente entre web e mobile.

Ordem sugerida, com um fluxo verificável por etapa:

1. Corrigir build web, contratos TypeScript e sessão do frontend; definir o repositório canônico e integrar OIDC com ZITADEL.
2. Conectar login, refresh e logout ao ZITADEL, usando suas políticas de cadastro e verificação; testar rejeição de token inválido/expirado e audience incorreta.
3. Integrar leitura de modelos/status e chat simples com `TrainingServiceGo`; confirmar primeiro resultado real de IA.
4. Integrar histórico com `AresChatGo`, validando persistência e isolamento entre dois usuários.
5. Integrar RAG: criar workspace, enviar documento, indexar e responder com fontes.
6. Integrar equipes e datasets; consolidar a propriedade dos jobs de fine-tuning em `AresFinetuningGo`, sem duas filas concorrentes; incluir progresso SSE e cancelamento.
7. Completar execução real na GPU com Kafka, agendamento persistente e Jobs Python na P7, conforme a proposta complementar; só então habilitar treinamento/exportação para usuários.

A escolha futura entre Svelte, Angular ou Expo não exige reescrever esses serviços: os contratos HTTP podem atender qualquer uma dessas interfaces. A integração do backend deve ser uma decisão separada da migração visual.
