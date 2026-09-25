#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

CLEAN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean)       CLEAN=true; shift ;;
        -h|--help)
            echo "Uso: $0 [--clean]"
            exit 0 ;;
        *) error "Opção desconhecida: $1"; exit 1 ;;
    esac
done

main() {
    load_env
    require_node

    if [[ "$(uname)" != "Darwin" ]]; then
        error "Build macOS só pode ser realizado no macOS."
        exit 1
    fi

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    if [[ "$CLEAN" == true ]]; then
        info "Limpando diretórios de build nativo..."
        cd "$PROJECT_ROOT"
        rm -rf src-tauri/target
    fi

    info "Compilando pacote nativo macOS (Tauri)..."
    local start_time; start_time=$(date +%s)
    cd "$PROJECT_ROOT"
    npm run tauri:build
    local elapsed=$(( $(date +%s) - start_time ))

    success "Build macOS concluído em ${elapsed}s"
    cd "$PROJECT_ROOT"
}

main "$@"
