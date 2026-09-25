#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

main() {
    load_env
    require_node

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    info "Executando testes da aplicação v2 (SvelteKit)..."
    cd "$PROJECT_ROOT"

    # Verificar se o comando test existe no package.json
    if ! grep -q '"test":' package.json; then
        warn "Comando 'test' não encontrado no package.json."
        warn "Para adicionar testes, instale Vitest ou Playwright."
        exit 0
    fi

    local start_time; start_time=$(date +%s)
    if npm test; then
        local elapsed=$(( $(date +%s) - start_time ))
        success "Todos os testes passaram em ${elapsed}s!"
    else
        error "Alguns testes falharam."
        exit 1
    fi

    cd "$PROJECT_ROOT"
}

main "$@"
