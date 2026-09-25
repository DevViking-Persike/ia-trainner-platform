#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

main() {
    load_env
    require_node

    if [[ "$(uname)" != "Darwin" ]]; then
        error "macOS Desktop só pode ser executado no macOS."
        exit 1
    fi

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         IA Trainner — Tauri Desktop          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Plataforma: ${BLUE}macOS (Native)${NC}"
    echo -e "${GREEN}║${NC}  Ambiente:   ${YELLOW}Desenvolvimento${NC}"
    echo -e "${GREEN}║${NC}  Ctrl+C para parar                            ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    echo ""

    info "Iniciando Tauri em modo de desenvolvimento..."
    cd "$PROJECT_ROOT"
    npm run tauri:dev
}

main "$@"
