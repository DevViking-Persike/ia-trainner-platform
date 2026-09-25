# Segurança de configuração e publicação

- Segredos residem no Infisical. Git contém nomes e contratos, nunca valores reais.
- Cada aplicação recebe somente o escopo necessário. Não exportar toda a raiz do projeto Infisical para um processo.
- Angular/Tauri são clientes públicos; apenas URLs públicas e IDs OIDC públicos podem chegar aos clientes.
- Não guardar API keys em `environment.ts`, Docker ARG, ConfigMap, dataset, log, relatório de scanner ou arquivo de exemplo.
- Gitleaks verifica o snapshot e o histórico publicado. Detecção automatizada reduz risco, mas não prova ausência absoluta de segredos.
- O histórico anterior fica no repositório privado. A credencial antiga identificada deve ter sua rotação/revogação confirmada pelo responsável; não foi usada nem alterada nesta reorganização.
- Submódulos privados não se tornam públicos ao publicar o principal. Sua liberação exige revisão própria de código, histórico e datasets.
- Habilitar o hook local com `git config core.hooksPath .githooks` e instalar Gitleaks 8.30.1. O hook impede publicar refs contendo achados.
- No CI, só jobs de publicação na branch principal e no ambiente de entrega podem solicitar identidade OIDC ao Infisical. PRs executam verificações sem credenciais.

Relate problemas privadamente ao mantenedor pelo GitHub. Não abra issues públicas com valores ou documentos privados.
