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
        error "Build iOS só pode ser realizado no macOS com Xcode."
        exit 1
    fi

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    if [[ "$CLEAN" == true ]]; then
        info "Limpando caches de build iOS..."
        cd "$PROJECT_ROOT"
        rm -rf src-tauri/gen/apple
    fi

    info "Compilando pacote iOS (Tauri v2)..."
    local start_time; start_time=$(date +%s)
    cd "$PROJECT_ROOT"
    npm run tauri:ios:build
    local elapsed=$(( $(date +%s) - start_time ))

    success "Build iOS concluído em ${elapsed}s"
    cd "$PROJECT_ROOT"
}

main "$@"
