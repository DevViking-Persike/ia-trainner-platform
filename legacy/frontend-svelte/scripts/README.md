# Scripts — IA Trainner Frontend (v2)

Scripts wrappers para inicialização, build, testes e deploy. Tudo gira em torno dos comandos `npm` definidos em `package.json` + `tauri` para shell nativo.

## Estrutura

```
scripts/
├── _common.sh                  # Funções compartilhadas (cores, env, node check)
├── start-tests.sh              # Roda npm test (Vitest — quando instalado)
├── web/
│   ├── start.sh                # Dev SSR (Vite + adapter-auto, porta 1420)
│   ├── build.sh                # npm run build (Web SSR)
│   └── deploy.sh               # Stub — deploy SSR ainda não implementado (Fase F do roadmap)
├── macos/
│   ├── start.sh                # tauri:dev (desktop nativo)
│   └── build.sh                # tauri:build (.dmg / .app)
├── ios/
│   ├── start.sh                # tauri:ios:dev (simulador)
│   └── build.sh                # tauri:ios:build (.ipa)
├── android/
│   ├── start.sh                # tauri:android:dev (emulador/device)
│   └── build.sh                # tauri:android:build (apk/aab)
└── full-stack/
    └── start-all.sh            # SSR em background com logs e health check
```

## Pré-requisitos

| Ferramenta | Plataformas | Uso |
|------------|-------------|-----|
| Node.js 20+ + npm | Todas | Build e execução |
| Rust (rustup) | Tauri (qualquer) | Compilação do shell nativo |
| Xcode 15+ | iOS, macOS | Compilação Apple |
| Android Studio + SDK | Android | Compilação + emulador |
| Docker 24+ | Web deploy (futuro) | Build de imagem SSR |
| rsync, ssh | Web deploy (futuro) | Sync e acesso remoto |

## Uso rápido

### Web (SvelteKit SSR)

```bash
./scripts/web/start.sh                    # Vite dev (porta 1420)
./scripts/web/build.sh                    # npm run build
./scripts/web/build.sh --clean            # Apaga build/ e .svelte-kit/ antes
./scripts/web/deploy.sh                   # Stub (falha — implementação pendente)
```

### macOS (Tauri Desktop)

```bash
./scripts/macos/start.sh                  # tauri:dev
./scripts/macos/build.sh                  # tauri:build
./scripts/macos/build.sh --clean          # Apaga src-tauri/target/ antes
```

### iOS (Simulador)

```bash
./scripts/ios/start.sh                    # tauri ios dev
./scripts/ios/start.sh --list-devices     # Listar simuladores disponíveis
./scripts/ios/build.sh                    # tauri ios build
```

### Android

```bash
./scripts/android/start.sh                # tauri android dev
./scripts/android/start.sh --list-devices # Listar emuladores e devices conectados
./scripts/android/build.sh                # tauri android build
```

### Testes

```bash
./scripts/start-tests.sh                  # npm test (Vitest)
```

> ⚠️ Stack de testes (Vitest + Testing Library + Playwright) ainda não está instalada. O script avisa e termina graciosamente se `package.json` não tiver `scripts.test`. Ver `docs/architecture/frontend/07-testing-analysis.md`.

### Full-stack (background)

```bash
./scripts/full-stack/start-all.sh         # SSR em background + health check + logs
```

## Variáveis de ambiente

Crie `.env`, `.env.local` ou `.env.development` na raiz do `Frontend/` para sobrescrever:

```bash
# URLs dos backends (usadas via $env/dynamic/private)
AUTH_BASE_URL=https://t1d5krmt04.execute-api.sa-east-1.amazonaws.com
TRAINING_BASE_URL=http://localhost:5200            # use port-forward em dev
RAG_BASE_URL=http://localhost:8001

# Tauri / mobile
ANDROID_HOME=$HOME/Library/Android/sdk
SIMULATOR_DEVICE="iPhone 16"
```

## Backends para dev local

Os backends rodam em K8s com ClusterIP. Para dev local, use port-forward:

```bash
kubectl port-forward svc/ia-trainner-training-service 5200:5200 -n apps
kubectl port-forward svc/ares-rag-service 8001:8001 -n apps
# Lambda Keycloak já é público via API Gateway, sem port-forward.
```

## Arquivos gerados (gitignored)

```
node_modules/    # Dependências Node
.svelte-kit/     # SvelteKit gerado
build/           # Output de npm run build
src-tauri/target/  # Output do Cargo
.pids/           # PIDs de processos em background
.logs/           # Logs de serviços
```
