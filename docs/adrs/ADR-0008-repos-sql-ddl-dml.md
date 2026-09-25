# ADR-0008 — Repositórios SQL de DDL e DML, Flyway em PreSync e papéis separados

## Status
Aceito

## Data
2026-09-25

## Contexto
O M2 cria as primeiras tabelas da plataforma no PostgreSQL compartilhado (`dados-pg-postgresql.dados.svc.cluster.local:5432`), e M3 e M4 acrescentam outras. Mudanças de esquema precisam ser versionadas, revisadas, reproduzíveis em teste e aplicadas antes da versão do código que depende delas, sem entregar credenciais administrativas do servidor à aplicação. O legado espalhava migrações entre serviços Go e o CLI Python; nenhuma delas é reaproveitada. O titular decidiu em 25/09/2026 manter esquema e dados em repositórios próprios, já criados como submódulos em `database/`, e não criar servidores de banco novos.

## Decisão
- **Repositórios privados.** `ia-trainner-sql-ddl` (submódulo `database/ia-trainner-sql-ddl`): migrações versionadas `postgresql/V<NNNN>__<descricao>.sql`, só DDL e privilégios; a partir do M3, validadores e índices do MongoDB em `mongodb/`. `ia-trainner-sql-dml` (submódulo `database/ia-trainner-sql-dml`): dados de referência em scripts repetíveis e idempotentes `postgresql/R__<descricao>.sql` e correções pontuais versionadas, só DML. Redis não tem repositório: suas chaves são efêmeras e definidas no código. Nenhum dos dois guarda credenciais, dados pessoais ou conteúdo de usuário.
- **Banco e papéis.** Banco `ia_trainner`, schema `ia_trainner`. `ia_trainner_migrator` é dono do banco e do schema e executa DDL e dados de referência; `ia_trainner_app` é o papel de runtime da API e do Worker, com `SELECT/INSERT/UPDATE/DELETE` por privilégios padrão concedidos pelo migrador (`ALTER DEFAULT PRIVILEGES` no `V0001`) e sem `CREATE`, `ALTER`, `DROP`, `TRUNCATE` ou `TEMP`. O `infra-k8s` cria banco, papéis e schema pelo SQL de [preparação](../contracts/m2/banco-de-dados.md#preparação-do-servidor), que também tira de `PUBLIC` o `CONNECT` e o `TEMPORARY` que o PostgreSQL concede em todo banco novo; as credenciais ficam no Infisical: migrador em `/ia-trainner/sql-ddl`, aplicação em `/ia-trainner/backend` (API) e, por referência, em `/ia-trainner/worker` (Worker). Credenciais administrativas do servidor nunca são reaproveitadas.
- **Ferramenta.** Flyway com SQL puro. Histórico do DDL em `ia_trainner.flyway_schema_history` e do DML em `ia_trainner.flyway_schema_history_dml`. Migração aplicada nunca é editada: correção entra em nova versão. `cleanDisabled=true` sempre.
- **Entrega.** Cada repositório constrói uma imagem `flyway/flyway` fixada por digest com seus arquivos SQL, publicada no Zot por digest pelo mesmo modelo de CI dos componentes (gitleaks, verificação, build e identidade OIDC do Infisical que só lê `/zot`). A branch `gitops` de cada repositório é fonte da Application multi-source única `ia-trainner` e traz um Job com `argocd.argoproj.io/hook: PreSync` e `hook-delete-policy: BeforeHookCreation`: DDL na onda `-2`, DML na onda `-1`. API e Worker só sincronizam depois das duas migrações. Os Jobs leem o Secret `ia-trainner-sql-ddl`, rodam com UID numérico não root, sistema de arquivos somente leitura e `/tmp` em `emptyDir`, e só têm saída para o PostgreSQL.
- **Histórico do DML fora do alcance do app.** A tabela `flyway_schema_history_dml` nasce depois dos privilégios padrão e ficaria legível e gravável pelo `ia_trainner_app`; o Job DML traz o callback `afterMigrate` que revoga esses privilégios, e o teste negativo cobre as duas tabelas de histórico.
- **Reservas de versão.** `V0001`–`V0002` no M2, `V0003` no M3, `V0004` no M4. O esquema do M2 e os parâmetros do Flyway estão em [banco-de-dados](../contracts/m2/banco-de-dados.md).

## Alternativas consideradas
- Migrações dentro do repositório do backend (EF Core Migrations ou runner no startup da API) — a API precisaria de credencial de DDL em runtime, e esquema e código ficariam acoplados no mesmo ciclo de release.
- Aplicar as migrações pelo CI — exigiria acesso do runner ao banco interno do cluster e deixaria a ordem em relação ao deploy fora do Argo.
- Liquibase ou outro runner — sem vantagem sobre o SQL puro do Flyway para o tamanho do projeto.
- Um único repositório para DDL e DML — mistura mudanças estruturais com dados de referência que mudam em outro ritmo e exigem outra revisão.
- Servidor PostgreSQL dedicado — contraria a decisão de usar os servidores compartilhados.

## Consequências
- Ganhos: esquema versionado e revisado à parte; a aplicação nunca executa DDL; a ordem migração → aplicação é garantida pelo Argo; o mesmo artefato é testado no CI, nos testes de integração do backend e aplicado no cluster.
- Trade-offs: dois repositórios e duas imagens a mais para publicar, com identidades no Zot e fontes no Argo.
- Risco: um Job PreSync com falha bloqueia a sincronização inteira da Application `ia-trainner`; mudanças que quebrem a versão anterior do código exigem migração em duas etapas (expandir, publicar o código, contrair).

## Impacto em código, testes e operação
- `ia-trainner-sql-ddl` e `ia-trainner-sql-dml`: `scripts/verify.sh` sobe um PostgreSQL descartável da mesma versão major do servidor compartilhado, roda como superusuário o mesmo SQL de preparação do `infra-k8s`, aplica as migrações duas vezes (a segunda sem efeito) e executa os testes negativos do papel de runtime; o DML aplica antes a imagem do DDL.
- Backend: a imagem DDL fica fixada em `services/backend/tests/IATrainner.Integration.Tests/ddl-image.txt` e é aplicada no PostgreSQL do Testcontainers; a string de conexão usa só o papel de runtime.
- `infra-k8s`: banco, papéis, schema, InfisicalSecret `ia-trainner-sql-ddl`, fontes `gitops` dos dois repositórios, NetworkPolicy dos Jobs e permissões do AppProject.
- Operação: falha de migração aparece como sync falho no Argo com o log do Job no Loki; rollback de esquema é uma nova migração, nunca restauração manual.

## ADRs relacionados
- ADR-0009 — Processamento assíncrono de documentos (primeiras tabelas aplicadas por este modelo)
