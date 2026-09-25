#!/usr/bin/env bash
set -euo pipefail
: "${EXPECTED_REVISION:?EXPECTED_REVISION ausente}"
: "${HEALTH_URL:?HEALTH_URL ausente}"
[[ "$HEALTH_URL" == https://* ]]
task_tmp="$(mktemp -d)"
trap 'rm -rf "$task_tmp"' EXIT
for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error --max-time 10 "$HEALTH_URL" -o "$task_tmp/health.json" &&
    jq -e --arg revision "$EXPECTED_REVISION" '.status == "ok" and .revision == $revision' "$task_tmp/health.json" >/dev/null; then
    echo 'Release confirmada.'
    exit 0
  fi
  echo "Aguardando release: $attempt/60"
  sleep 10
done
echo 'A release esperada não ficou disponível dentro do prazo.' >&2
exit 1
