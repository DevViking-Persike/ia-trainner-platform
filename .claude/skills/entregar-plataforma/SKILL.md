---
name: entregar-plataforma
description: Implementar e entregar marcos funcionais da IA Trainner, da interface Angular ao backend .NET e ao deploy GitOps. Use quando o usuário solicitar desenvolver, concluir ou retomar um marco da plataforma; não para perguntas sobre o projeto.
---

# Entregar IA Trainner

Você é responsável por implementar, integrar, validar e entregar uma funcionalidade utilizável da IA Trainner. Trabalhe no código existente. Uma página de apresentação, um plano ou um pipeline verde não substituem o fluxo funcional solicitado.

Pedido desta execução: **$ARGUMENTS**.

## Escolher o escopo

- Sem argumento ou `acesso`: concluir o marco M1, login e área autenticada.
- `documentos`, `rag` ou `treinamento`: concluir o marco correspondente e os pré-requisitos ausentes que ele exigir.
- `continuar`: ler o registro de progresso e retomar o primeiro marco incompleto, sem refazer entregas verificadas.
- `completo`: executar M1 → M2 → M3 → M4, entregando e verificando cada marco antes de avançar. Persistir progresso para retomada se a sessão acabar.
- `status`: somente inspecionar código, progresso e evidências; não modificar nem publicar nada.

Leia os critérios do marco escolhido em [references/marcos.md](references/marcos.md). Quando o pedido delimitar um escopo menor, respeite-o. Não iniciar Tauri/mobile nesta execução sem solicitação específica.

## Contexto antes de editar

1. Leia `AGENTS.md`, `CLAUDE.md`, `workspace.json`, `docs/architecture/platform.md` e `docs/operations/delivery.md` na raiz. Leia as instruções dos componentes que serão alterados. As decisões atuais Angular/.NET/ZITADEL substituem documentos históricos Svelte/Go/Keycloak.
2. Verifique branches, remotes, commits e alterações locais no principal e nos componentes envolvidos. Preserve trabalho existente, inclusive submódulos sujos do legado. Não inicialize `legacy/` recursivamente. Use `python3 scripts/workspace.py check` para conferir a composição.
3. Confirme o estado real em vez de assumir que o marco já existe: inicialmente o Angular só tem uma página de migração, o .NET tem API/Worker básicos e o Python ainda não está integrado ao executor. O domínio online não prova que a plataforma está pronta.
4. Localize `infra-k8s` e `SITE - PERSIKE/site-persike-svelte` ao lado do principal no diretório Dev. Use `pwd -P` para resolver symlinks. O bootstrap está em `infra-k8s/clusters/flex/apps/ia-trainner`. Não clone cópias adicionais dos componentes.
5. Faça um plano curto do marco, com contratos HTTP/eventos, arquivos responsáveis e critérios observáveis. Comece a implementação na mesma execução. Consulte documentação oficial atual quando precisar escolher SDKs ou APIs; preserve versões e lockfiles existentes quando adequados.

## Decisões fixadas

| Área | Decisão |
|---|---|
| Frontend | Angular standalone, TypeScript strict, features e adaptadores HTTP; `apps/frontend` |
| Backend | .NET 10 LTS; Domain, Application, Infrastructure, API e Worker; `services/backend` |
| Arquitetura | Clean/Hexagonal para dependências e portas; DDD para domínio; Kafka para integração por eventos na mesma solução |
| Identidade | ZITADEL com telas próprias; BFF .NET (Session API v2 e OIDC no servidor, cookie `httpOnly` + sessão no Redis); validação e autorização na API |
| Estado | PostgreSQL e outbox durável; Redis para cache; MongoDB para conversas; Qdrant para vetores; S3/RustFS para arquivos e artefatos |
| IA | Gemini via SDK oficial apropriado para documentos/embeddings; modelos da P7 como último recurso |
| Execução | Angular/API/Worker na H6; treino Python em Jobs Kubernetes na P7, RTX 3060 de 12 GB |
| Operação | Infraestrutura existente em `infra-k8s`; OpenTelemetry → coletores e stack Grafana existentes |
| Entrega | `https://ia-trainner.victorpersike.dev.br`; Actions → Zot por digest → branch gitops → Argo CD |

Introduza cada integração quando o caso de uso exigir. Não crie um repositório por padrão arquitetural nem um serviço separado para cada entidade. Os repositórios ativos já existem; prefira evoluí-los.

## Implementar com ciclos curtos

- Trabalhe em um fluxo completo por vez: interação do usuário → API autorizada → efeito real → resposta/estado visível. Não declarar sucesso com mocks, contadores inventados, armazenamento temporário de produção ou botões sem ação.
- Reaproveite regras e contratos do legado depois de avaliá-los; não copie credenciais, acoplamentos de infraestrutura ou integrações Keycloak para o código ativo.
- Se houver agentes disponíveis e a execução permitir delegação, paralelize apenas tarefas independentes depois de acordar contratos. Dê a cada agente propriedade de arquivos e critérios de aceite; um responsável integra e publica. Sem agentes, execute o mesmo fluxo sequencialmente. Não criar concorrência sobre os mesmos arquivos ou branches.
- Faça revisão focada em autorização por usuário, persistência, falhas, contratos e operação antes de publicar. Corrija os problemas encontrados e execute os testes afetados, sem repetir suítes sem motivo.
- Se faltar acesso real a ZITADEL, Infisical, GitHub ou cluster, conclua o trabalho independente e descreva o recurso/ação exatos que faltam. Não invente client IDs, audiences, endpoints ou resultados. Não peça valores secretos no chat. Se o login exigir interação humana/2FA, solicite somente essa interação e registre o teste como pendente até verificá-lo.

## Segredos e infraestrutura

- Use Infisical por ambiente e pasta. `scripts/with-infisical.py` já fornece injeção local; o operador já sincroniza Secrets no cluster. Leia os metadados locais ignorados e a documentação para localizar o projeto; não exporte todas as pastas para um processo.
- `/embedding` contém `sdk-gemini-1` e `sdk-gemini-2`; o wrapper mapeia para `Gemini__ApiKey` e `Gemini__FallbackApiKey`. Trate valores só em memória/ambiente privado, nunca em argumentos, logs, Git, screenshots ou build args. Não use troca de chave para contornar limites do provedor.
- `/ia-trainner/backend` e `/ia-trainner/training` precisam ser conferidas/provisionadas conforme os adaptadores. `/zot` já atende a publicação e `/ia-trainner/gitops` guarda a chave de leitura do frontend. Não substituir esses scopes por senhas administrativas reaproveitadas.
- O Angular recebe somente configuração pública, como authority, client ID e URL da API. Nenhum client secret, token de máquina, segredo Gemini ou conexão de banco entra no bundle. Configurações públicas não precisam ser tratadas como credenciais.
- Mantenha o principal público e componentes privados. Não publique datasets, PDFs reais, conversas, pesos, segredos ou histórico privado. Resumos de progresso no principal público devem usar IDs técnicos e exemplos sintéticos.
- Alterações de bootstrap, rotas e RBAC ficam em `infra-k8s`; workloads devem ser reconciliados pelo Argo. Não ampliar privilégios globais nem criar bancos/filas duplicados para evitar investigar os existentes.
- A execução não concede permissões além das ferramentas e da autorização do usuário. Preserve as proteções existentes; não use flags para ignorar permissões. Mudanças destrutivas ou que afetem recursos compartilhados fora do escopo exigem tratar esse impacto antes de executar.

## Verificar e publicar

Execute os checks adequados nos componentes alterados, respeitando seus `AGENTS.md`:

```sh
# A partir de apps/frontend
npm ci
npm test -- --watch=false
npm run build

# A partir de services/backend
dotnet restore --locked-mode
dotnet test -c Release

# A partir de services/training-python, no ambiente Python configurado
pytest tests/

# A partir do principal
python3 scripts/workspace.py check
git diff --check
```

Acrescente testes úteis do comportamento novo: OIDC/callback e autorização no M1, persistência e isolamento no M2, recuperação/fontes no M3, falhas/idempotência/recuperação da GPU no M4. Use serviços de teste isolados e dados sintéticos; não redefina dados compartilhados para rodar testes.

1. Construa e valide os manifests/imagens alterados. Verifique segredos nas mudanças e nos commits destinados ao remoto com os scanners existentes. Nunca use `git push --all`, `--mirror`, force-push ou reset para descartar trabalho de terceiros.
2. Faça commits pequenos por componente e publique os commits necessários antes de atualizar os gitlinks no principal. Preserve a política de branches/revisão encontrada; use branches `codex/` quando criar uma branch de trabalho. Não contorne checks ou proteções para conseguir fazer merge.
3. Quando a entrega no ambiente estiver autorizada, integre pelo caminho que aciona os workflows existentes. Habilite `DEPLOY_ENABLED` de backend/Python somente após preparar seus scopes, identidades OIDC, Secrets e Applications. O frontend já tem entrega habilitada; não recrie seu pipeline.
4. Aguarde CI, publicação e sincronização do Argo. Compare o commit/digest esperado e a revisão de `/healthz`; configure uma rota de saúde específica para a API para não confundir sua revisão com a do frontend.
5. Valide HTTPS e o fluxo do marco no navegador no domínio oficial. Uma resposta 200 da SPA para `/api/...` não prova que a API está funcionando: confira JSON, autenticação e conteúdo esperado. Não desative validação TLS nem autenticação para aprovar o teste.
6. Ao encontrar falha, corrija a causa e repita apenas os checks necessários. Se não puder resolver sem uma informação/permissão externa, pare a ação dependente e reporte o bloqueio concreto; nunca marque a entrega como concluída.

## Progresso e definição de conclusão

Mantenha `docs/operations/development-status.md` com: marco, estado (`pendente`, `em andamento`, `implementado`, `validado localmente`, `publicado`, `verificado no ambiente` ou `bloqueado`), commits por repositório, testes/comandos/resultados, links de CI, revisão publicada, evidências funcionais, pendências e próxima ação exata. Crie o arquivo na primeira execução de implementação, sem sobrescrever registros anteriores.

Após interrupção/compactação, reconcilie esse registro com Git e ambiente e continue da primeira pendência. Não confunda um checkpoint com a conclusão do objetivo. No modo `completo`, prossiga ao próximo marco quando o anterior estiver verificado, sem pedir autorização de novo para trabalho já autorizado.

Ao encerrar, informe em português: o que o usuário já consegue fazer, o que foi testado de verdade, link/revisão publicada e o que falta. Só diga que a plataforma está pronta quando todos os marcos pedidos estiverem verificados no ambiente. **M1 concluído significa acesso funcionando, não documentos/RAG/treinamento concluídos.**
