#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

FRONTEND_PORT="${FRONTEND_PORT:-1420}"

main() {
    load_env
    require_node
    ensure_install

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    free_port "$FRONTEND_PORT"

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         IA Trainner — Web (SvelteKit)        ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Modo:      ${BLUE}Desenvolvimento (SSR)${NC}"
    echo -e "${GREEN}║${NC}  URL:       ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "${GREEN}║${NC}  Ctrl+C para parar                            ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    echo ""

    info "Iniciando SvelteKit dev server..."
    cd "$PROJECT_ROOT"
    npm run dev
}

main "$@"
