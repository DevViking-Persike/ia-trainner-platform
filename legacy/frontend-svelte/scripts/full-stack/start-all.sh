#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/scripts/_common.sh"

PORT="${FRONTEND_PORT:-1420}"
PIDS_DIR="$PROJECT_ROOT/.pids"
LOGS_DIR="$PROJECT_ROOT/.logs"
mkdir -p "$PIDS_DIR" "$LOGS_DIR"

PIDS=()
cleanup() {
    echo ""
    info "Encerrando processos..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            info "Encerrado PID $pid"
        fi
    done
    rm -f "$PIDS_DIR"/*.pid 2>/dev/null || true
    success "Todos os processos encerrados."
}
trap cleanup EXIT INT TERM

main() {
    load_env
    require_node

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    # Aviso sobre backends baseados em K8s/External
    # Útil se o usuário estiver usando por-forward para devs.
    info "Dica: Para conexão com backends Reais no K8s, use 'kubectl port-forward'."

    free_port "$PORT"

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          IA Trainner — Full Stack Local (v2)         ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Frontend:  ${BLUE}http://localhost:${PORT}${NC}"
    echo -e "${GREEN}║${NC}  Modo:      ${YELLOW}SvelteKit + SSR${NC}"
    echo -e "${GREEN}║${NC}  Logs:      ${YELLOW}${LOGS_DIR}/${NC}"
    echo -e "${GREEN}║${NC}  Ctrl+C para parar tudo                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""

    info "Iniciando SvelteKit (porta $PORT)..."
    cd "$PROJECT_ROOT"
    npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
    local v2_pid=$!
    PIDS+=("$v2_pid")
    echo "$v2_pid" > "$PIDS_DIR/v2.pid"

    if wait_for_service "Frontend (v2)" "http://localhost:${PORT}" 30; then
        success "SvelteKit iniciado!"
    else
        warn "Verifique os logs: tail -f $LOGS_DIR/frontend.log"
    fi

    echo ""
    info "Acompanhe os logs em: tail -f $LOGS_DIR/frontend.log"
    echo ""

    wait "${PIDS[@]}" 2>/dev/null || true
}

main "$@"
