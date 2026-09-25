# Worker e ajustes de implantação

Origem: C-M2-DEPLOY. Manifests em `services/backend/deploy/kubernetes`, na mesma kustomization e branch `gitops` da API; a Application única `ia-trainner` do Argo CD aplica tudo.

## Worker

| Item | Valor |
|---|---|
| Deployment | `ia-trainner-worker`, namespace `ia-trainner`, 1 réplica, estratégia `Recreate` (um consumidor, um relay e uma varredura) |
| Imagem | a mesma da API (`ia-trainner-backend`), pelo mesmo digest |
| Comando | `["dotnet", "/app/worker/IATrainner.Worker.dll"]`, `workingDir: /app/worker` |
| Rótulos do pod | `app.kubernetes.io/name: ia-trainner-worker` e `kafka-client: "true"` (liberado pela política do Kafka) |
| Nó | `kubernetes.io/hostname: h6`, `kubernetes.io/arch: amd64` |
| ServiceAccount | `ia-trainner-worker`, `automountServiceAccountToken: false` até o M4 |
| Segurança | `runAsNonRoot`, UID/GID 1654, seccomp `RuntimeDefault`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]` |
| Volumes | `/tmp` em `emptyDir` com `sizeLimit: 1Gi` (cópia do original e páginas para OCR) |
| Configuração | `envFrom` do Secret `ia-trainner-worker` (pasta `/ia-trainner/worker`), nunca o Secret da API ([configuracao](configuracao.md)) |
| Recursos (proposta, ajustar após medição) | requests `100m` / `256Mi`; limits `1` CPU / `1Gi` |
| Saúde | porta interna `8081` (`health`): `GET /healthz` (processo vivo, sem dependências) e `GET /readyz` (configuração válida, PostgreSQL responde, consumidor Kafka conectado) |
| Sondas | startup `/healthz` a cada 2 s, até 30 falhas; readiness `/readyz` a cada 10 s; liveness `/healthz` a cada 20 s |
| Encerramento | `terminationGracePeriodSeconds: 60`; no SIGTERM para de consumir e não confirma offset de trabalho inacabado (a mensagem volta) |
| Exposição | nenhuma: sem Service e sem rota no Traefik |

```yaml
# Trecho normativo; o restante segue o padrão do Deployment da API.
spec:
  replicas: 1
  strategy: { type: Recreate }
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ia-trainner-worker
        kafka-client: "true"
    spec:
      serviceAccountName: ia-trainner-worker
      automountServiceAccountToken: false
      containers:
        - name: worker
          image: ia-trainner-backend
          command: ["dotnet", "/app/worker/IATrainner.Worker.dll"]
          workingDir: /app/worker
          ports: [{ name: health, containerPort: 8081 }]
          envFrom: [{ secretRef: { name: ia-trainner-worker } }]
          readinessProbe: { httpGet: { path: /readyz, port: health }, periodSeconds: 10 }
          livenessProbe: { httpGet: { path: /healthz, port: health }, periodSeconds: 20 }
          volumeMounts: [{ name: tmp, mountPath: /tmp }]
      volumes:
        - name: tmp
          emptyDir: { sizeLimit: 1Gi }
```

## API

- `automountServiceAccountToken: false` continua.
- Rota de upload com `MaxRequestBodySize = Documents__MaxUploadBytes + 1 MiB`; demais rotas do M2 com 64 KiB. Multipart lido em streaming (`MultipartReader`), sem `IFormFile` e sem buffer em memória ou disco.
- Limite de memória de 256Mi para 512Mi (proposta), para as partes de 8 MiB do S3 e uploads simultâneos.
- Readiness continua em `/api/healthz`; as rotas do M2 respondem 503 enquanto faltar configuração.

## Pré-requisitos no `infra-k8s`

| Recurso | Regra |
|---|---|
| PostgreSQL | banco `ia_trainner`, papéis e schema pelo SQL de [preparação](banco-de-dados.md#preparação-do-servidor), e escopos do Infisical |
| Infisical | pasta `/ia-trainner/worker` e InfisicalSecret `ia-trainner-worker`, no padrão do `ia-trainner-backend` (`recursive: false`), com as chaves de [configuracao](configuracao.md) |
| Kafka | tópicos `ia-trainner.documents.v1` e `ia-trainner.documents.dlq.v1` criados antes do Worker; Kafka UI só leitura recomendado ([eventos-kafka](eventos-kafka.md#confiança)) |
| RustFS | bucket `ia-trainner-documents` e chave de aplicação ([armazenamento-s3](armazenamento-s3.md)) |
| Saída do Worker | PostgreSQL 5432, Kafka 9092, RustFS, `generativelanguage.googleapis.com:443`, coletor OTLP existente e DNS; nada além |
| Saída da API | acrescenta PostgreSQL 5432 e RustFS às regras do M1 (Redis, SMTP, ZITADEL, OTLP) |
| Entrada do Worker | só as sondas do kubelet |
| Traefik `/api` | corpo de até `Documents__MaxUploadBytes` + 1 MiB, sem middleware de buffering (ou com limite maior que esse) |
| Argo CD | fontes `gitops` de `ia-trainner-sql-ddl` e `ia-trainner-sql-dml` na Application `ia-trainner`, com os Jobs PreSync ([ADR-0008](../../adrs/ADR-0008-repos-sql-ddl-dml.md)) |

## Verificação da release

A verificação confere a revisão da API em `/api/healthz` e a saúde do Worker pelo rollout (`Ready` exige `/readyz`), sem acesso novo do runner além do já concedido. O Worker registra a revisão (`APP_REVISION`) no log de inicialização.
