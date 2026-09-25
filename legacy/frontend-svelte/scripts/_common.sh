#!/usr/bin/env bash
# Funções e variáveis compartilhadas entre todos os scripts.
# Não executar diretamente — source este arquivo.

# --- Cores ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Diretórios ---
# SCRIPT_DIR deve ser definido pelo script que faz source.
# PROJECT_ROOT é a raiz do submodule Frontend (onde vivem package.json, src/, src-tauri/).
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "${SCRIPT_DIR}/.." 2>/dev/null && pwd)}"

# --- Verificar Node.js ---
require_node() {
    if ! command -v node &>/dev/null; then
        error "Node.js não encontrado. Requer node v20+."
        exit 1
    fi
    if ! command -v npm &>/dev/null; then
        error "npm não encontrado. Instale o Node.js."
        exit 1
    fi
    info "Node version: $(node -v)"
}

# --- Verificar Rust (para Tauri) ---
require_rust() {
    if ! command -v cargo &>/dev/null; then
        error "Rust/cargo não encontrado. Instale via https://rustup.rs/"
        exit 1
    fi
    info "Rust version: $(rustc --version)"
}

# --- Carregar .env ---
load_env() {
    local env_file=""
    if [[ -f "$PROJECT_ROOT/.env.development" ]]; then
        env_file="$PROJECT_ROOT/.env.development"
    elif [[ -f "$PROJECT_ROOT/.env" ]]; then
        env_file="$PROJECT_ROOT/.env"
    fi
    if [[ -n "$env_file" ]]; then
        info "Carregando variáveis de $env_file"
        set -a
        # shellcheck disable=SC1090
        source "$env_file"
        set +a
    fi
}

# --- Garantir node_modules ---
ensure_install() {
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
        info "node_modules não encontrado — rodando npm install..."
        (cd "$PROJECT_ROOT" && npm install)
    fi
}

# --- Liberar porta ---
free_port() {
    local port=$1
    local pid
    pid=$(lsof -ti :"$port" 2>/dev/null || true)
    if [[ -n "$pid" ]]; then
        warn "Porta $port em uso (PID: $pid). Encerrando..."
        kill "$pid" 2>/dev/null || true
        sleep 1
    fi
}

# --- Health check com retry ---
wait_for_service() {
    local name=$1
    local url=$2
    local max_retries="${3:-30}"
    local retry=0

    info "Aguardando $name..."
    while [[ $retry -lt $max_retries ]]; do
        if curl -sf -o /dev/null "$url" 2>/dev/null; then
            success "$name respondendo em $url"
            return 0
        fi
        retry=$((retry + 1))
        sleep 2
    done

    error "$name não respondeu após $((max_retries * 2))s em $url"
    return 1
}
