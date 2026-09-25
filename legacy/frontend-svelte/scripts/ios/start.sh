#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

SIMULATOR_DEVICE="${SIMULATOR_DEVICE:-}"

main() {
    load_env
    require_node

    if [[ "$(uname)" != "Darwin" ]]; then
        error "iOS só pode ser executado no macOS."
        exit 1
    fi

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    # Listar simuladores disponíveis se pedido
    if [[ "${1:-}" == "--list-devices" ]]; then
        info "Simuladores iOS disponíveis:"
        xcrun simctl list devices available | grep -E "iPhone|iPad"
        exit 0
    fi

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         IA Trainner — iOS Simulator          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Plataforma: ${BLUE}iOS (Tauri v2)${NC}"
    [[ -n "$SIMULATOR_DEVICE" ]] && \
    echo -e "${GREEN}║${NC}  Device:     ${BLUE}${SIMULATOR_DEVICE}${NC}"
    echo -e "${GREEN}║${NC}  Ctrl+C para parar                            ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    echo ""

    info "Iniciando Tauri para iOS..."
    cd "$PROJECT_ROOT"

    # Garantir que a porta 1420 está livre
    lsof -ti:1420 | xargs kill -9 2>/dev/null || true

    if [[ -n "$SIMULATOR_DEVICE" ]]; then
        info "Usando device: $SIMULATOR_DEVICE"
        npx tauri ios dev "$SIMULATOR_DEVICE"
    else
        npx tauri ios dev
    fi
}

main "$@"
