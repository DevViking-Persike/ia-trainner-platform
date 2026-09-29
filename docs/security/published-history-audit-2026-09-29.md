# Revisão do histórico publicado — 29/09/2026

Repositório principal: `DevViking-Persike/ia-trainner-platform`, **público**.
`workflows-ia-trainner` é o repositório antigo **privado** e também o nome da pasta
local; `origin` aponta para o principal e `legacy-origin` preserva a referência antiga.
A CI principal valida a composição. CI/CD de cada componente publica sua imagem
e seus manifests GitOps; Argo CD aplica o conjunto.

Foi feito clone espelho atualizado de cada repositório abaixo e varredura de todos
os refs recebidos com Gitleaks 8.30.1, regras padrão e regra adicional de senha em
connection string. Relatórios mantêm valores ocultos. Contagem anterior às mudanças
de S3 desta entrega:

| Repositório | Visibilidade | Commits examinados | Resultado |
|---|---|---:|---|
| ia-trainner-platform | público | 25 | sem achados |
| ia-trainner-frontend-angular | privado | 48 | sem achados |
| ia-trainner-backend-dotnet | privado | 47 | sem achados |
| ia-trainner-finetuning-py | privado | 36 | dois nomes de variável, sem valores de credenciais |
| ia-trainner-sql-ddl | privado | 13 | sem achados |
| ia-trainner-sql-dml | privado | 5 | sem achados |

No Python, os únicos alertas adicionais da regra genérica eram os nomes exatos
`FINETUNING_S3_ACCESS_KEY` e `FINETUNING_S3_SECRET_KEY`. A exceção existente aceita
apenas esses nomes, e a varredura com ela não apresentou outros achados.

**O legado não está liberado para publicação:** `workflows-ia-trainner` contém duas
ocorrências de senha literal em connection strings no histórico (`CLAUDE.md:196`
e `src/KeycloakService/Function.cs:40`, commit
`2798ed6c47a73aaee6e61c1b587f306dbf79ceda`). Valores não foram reproduzidos.
Não foi verificado se ainda são válidos. Antes de tornar esse legado público,
revisar/rotacionar as credenciais se aplicável e sanear o histórico publicado.
Não alterar visibilidade nem enviar refs históricos locais com `push --all`/`--mirror`.

Nomes de variáveis, buckets, domínios e configuração sem credenciais podem estar
no Git. Valores secretos permanecem no Infisical. Esta é uma varredura de Git;
não constitui garantia absoluta nem auditoria de logs, artifacts, issues ou
configurações do GitHub. A publicação de componentes privados exige decisão
explícita do titular; a visibilidade não foi alterada.
