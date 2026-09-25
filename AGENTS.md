# IA Trainner Platform

Este é o repositório principal de composição. A decisão atual do usuário substitui as instruções históricas de Svelte, Go e Keycloak.

- Frontend ativo: Angular em `apps/frontend` (submódulo).
- Backend ativo: .NET 10 em `services/backend` (submódulo).
- Treinamento: Python em `services/training-python` (submódulo).
- `legacy/` é referência de migração; não inicializar seus submódulos recursivamente por padrão.
- Backend: domínio sem infraestrutura, casos de uso/portas na Application, adaptadores na Infrastructure, API/Worker como composition roots. DDD e integração por eventos Kafka na mesma solução.
- ZITADEL para identidade. PostgreSQL/outbox para estado durável; Redis, MongoDB, Qdrant e armazenamento S3 conforme responsabilidade.
- Gemini para extração/embeddings; P7 como último recurso e para treino Python, com GPU exclusiva.
- Segredos somente via Infisical, por ambiente e escopo. Nunca em Git, argumentos, logs, build args ou bundles Angular/Tauri.
- CI/CD conforme `site-persike-svelte`: validar, construir imagem, publicar Zot por digest, atualizar manifests GitOps, Argo CD aplicar e verificar release.
- Leia as instruções de cada submódulo antes de editá-lo; preserve alterações locais existentes. Commit do submódulo antes de atualizar seu ponteiro aqui.
- Só o repositório principal será público nesta reorganização; componentes existentes mantêm sua visibilidade.

Validação da composição: `python3 scripts/workspace.py check`.
Não execute `git push --all` ou `--mirror`: refs do histórico privado permanecem locais para recuperação.
