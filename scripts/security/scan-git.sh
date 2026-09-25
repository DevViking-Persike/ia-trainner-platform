#!/usr/bin/env bash
set -euo pipefail
scanner="$(command -v gitleaks || true)"
if [[ -z "$scanner" ]]; then scanner="$(git rev-parse --git-path tools/gitleaks)"; fi
[[ -x "$scanner" ]] || { echo 'Instale Gitleaks 8.30.1 para verificar o histórico.' >&2; exit 1; }
# HEAD deliberately excludes private historical refs retained only in the migration checkout.
# CI clones the new public repository and scans all its remote refs separately.
"$scanner" git . --log-opts="${1:-HEAD}" --config .gitleaks.toml --redact=100 --no-banner
