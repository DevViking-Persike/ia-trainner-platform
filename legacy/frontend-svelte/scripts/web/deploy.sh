#!/usr/bin/env bash
# Deploy Web SSR (SvelteKit + Node) — STUB.
#
# A v2 (SvelteKit) ainda não tem deploy público. A versão Blazor antiga continua
# atendendo https://victorpersike.dev.br/ia-trainner/. Este script existe como
# placeholder e falha de propósito até que o Dockerfile + manifesto K8s para SSR
# sejam criados (ver docs/architecture/frontend/09-recommended-evolution.md, Fase F).
#
# Quando implementar:
# 1. Criar Dockerfile (Node 22 alpine) que faz `npm ci && npm run build` e roda `node build`.
# 2. Criar manifesto K8s em /Volumes/HDX/Dev/infra-criar-vm-oracle/k8s/apps/ia-trainner-web-v2.yaml.
# 3. Substituir o corpo deste script pelos passos: build local → rsync → docker build → push → kubectl rollout restart.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

main() {
    error "Deploy SSR ainda não implementado para a v2 (SvelteKit)."
    info  "A versão Blazor antiga continua em https://victorpersike.dev.br/ia-trainner/."
    info  "Roadmap: docs/architecture/frontend/09-recommended-evolution.md (Fase F)."
    info  "Pendente: Dockerfile (Node 22) + manifesto K8s + atualizar este script."
    exit 1
}

main "$@"
