#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

main() {
    load_env
    require_node

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    # Verificar Android SDK
    if [[ -z "${ANDROID_HOME:-}" ]] && [[ -z "${ANDROID_SDK_ROOT:-}" ]]; then
        # Tentar paths padrão no macOS
        if [[ -d "$HOME/Library/Android/sdk" ]]; then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
        elif [[ -d "$HOME/Android/Sdk" ]]; then
            export ANDROID_HOME="$HOME/Android/Sdk"
        else
            error "ANDROID_HOME não configurado. Instale o Android SDK."
            exit 1
        fi
        info "ANDROID_HOME: $ANDROID_HOME"
    fi

    # Listar emuladores disponíveis se pedido
    if [[ "${1:-}" == "--list-devices" ]]; then
        info "Emuladores Android disponíveis:"
        "$ANDROID_HOME/emulator/emulator" -list-avds 2>/dev/null || warn "Nenhum emulador encontrado"
        info "Dispositivos conectados:"
        "$ANDROID_HOME/platform-tools/adb" devices 2>/dev/null || warn "adb não encontrado"
        exit 0
    fi

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         IA Trainner — Android                ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Plataforma: ${BLUE}Android (Tauri v2)${NC}"
    echo -e "${GREEN}║${NC}  SDK:        ${BLUE}${ANDROID_HOME}${NC}"
    echo -e "${GREEN}║${NC}  Ctrl+C para parar                            ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    echo ""

    info "Iniciando Tauri para Android..."
    cd "$PROJECT_ROOT"
    npm run tauri:android:dev
}

main "$@"
