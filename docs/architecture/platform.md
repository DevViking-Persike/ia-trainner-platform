# Arquitetura atual: Angular, .NET e Python

Decisão do usuário em 25/09/2026. Substitui as recomendações anteriores de backend Go e frontend Svelte como implementação ativa. As análises antigas permanecem como histórico de avaliação.

O principal público é `ia-trainner-platform`. Componentes são repositórios separados fixados por submódulos; seus checkouts reais ficam dentro do principal, com symlinks opcionais na pasta Dev. Não há repositório separado para cada padrão arquitetural.

| Camada | Responsabilidade |
|---|---|
| Angular | Interface, features/casos de uso de UI e adaptadores HTTP; somente configuração pública |
| .NET Domain | Regras de datasets, trabalhos e janelas; DDD sem dependências de infraestrutura |
| .NET Application | Casos de uso e portas para persistência, eventos, IA, arquivos e Kubernetes |
| .NET Infrastructure | Implementações das portas, incluindo SDKs e OpenTelemetry |
| .NET API | Entrada HTTP autenticada pelo ZITADEL; validação de autorização |
| .NET Worker | Agendador, outbox, consumo Kafka, reconciliação de Jobs e exclusão da GPU |
| Python | Treino/avaliação/exportação em imagem própria, executada como Job na P7 |

API e Worker são executáveis da mesma solução, com ciclos de execução separados. A organização Hexagonal implementa portas/adaptadores; Clean preserva direção das dependências; DDD define linguagem e regras; eventos conectam processos. PostgreSQL guarda agenda, estado e outbox. Kafka transporta eventos elegíveis, com idempotência e recuperação. Redis é temporário, MongoDB guarda conversas, Qdrant guarda vetores e S3 guarda artefatos.

Fluxo de documentos: extração direta quando houver texto utilizável; modelo multimodal Gemini para imagens/PDFs que precisem de OCR; texto dividido em trechos; embeddings Gemini; índice Qdrant específico para o perfil. P7 é último recurso para embeddings/visão. O fallback exige índice compatível, nunca mistura vetores de modelos distintos. Durante treino, a GPU fica exclusiva e o serviço de inferência é restaurado por reconciliação.

O frontend usa `https://ia-trainner.victorpersike.dev.br`, com DNS Cloudflare, TLS automático no Traefik e bootstrap em `infra-k8s/clusters/flex/apps/ia-trainner`. Frontend web/API/Worker ficam na H6. Python com GPU e Ollama ficam na P7. Os bancos e o stack Grafana existentes continuam sob gestão de `infra-k8s`; não foram incorporados ao principal público. Bibliotecas Python de OCR em CPU podem ser usadas na H6 quando necessário: placement depende do recurso exigido, não da linguagem.

Identidade: ZITADEL, com telas próprias e BFF .NET para o navegador (tokens só no servidor) e validação de issuer/audience/assinatura na API; clientes nativos futuros usarão OIDC/PKCE. Bibliotecas antigas de Keycloak permanecem como referência e não são o backend ativo. Nenhuma chave Gemini ou credencial administrativa pode ser enviada ao Angular/Tauri.

Observabilidade: OpenTelemetry nos processos .NET/Python, W3C trace context em HTTP/Kafka, logs com trace/span/job IDs e armazenamento nos serviços existentes do Grafana. O backend .NET inicial já contém instrumentação HTTP/runtime e exportação OTLP opcional. Instrumentação do fluxo de treinamento e correlação ponta a ponta ainda precisam ser implementadas.

## Estado concreto desta reorganização

- Angular 22 compilável e testado, com página explícita de migração; não portamos todas as telas Svelte.
- .NET 10 API/Worker e projetos Domain/Application/Infrastructure; regra de janela testada; autenticação fechada por padrão e saúde/revisão.
- Python existente reaproveitado; imagem CUDA e pipeline de entrega preparados. Nenhum treino GPU validado nesta reorganização.
- Pipelines Actions para os três componentes ativos, com credenciais Infisical em runtime e manifests GitOps por digest.
- Bootstrap do frontend criado no `infra-k8s`: namespace, pull secret e chave GitOps pelo Infisical, projeto Argo restrito, regras de rede, DNS e TLS. Publicação do Angular habilitada no GitHub Actions.
- M1 (acesso): telas próprias de login, 2FA (TOTP), cadastro e recuperação no Angular; a API .NET atua como BFF (Session API v2 e OIDC do ZITADEL no servidor, cookie `httpOnly` e sessão no Redis) e valida issuer/audience/assinatura/validade e a função `user` do projeto. Mesma origem (`/api`), configuração no Infisical `/ia-trainner/backend`, traces OTLP para o Jaeger existente. Contrato em [auth-bff](auth-bff.md); estado e evidências em [development-status](../operations/development-status.md).
- Adaptadores de negócio (documentos, RAG, treinamento), scopes de treinamento, integração de Gemini e demais telas continuam pendentes.

As bases são pontos de partida verificáveis, não uma aplicação de treinamento pronta para produção.
