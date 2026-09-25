#!/usr/bin/env bash
set -euo pipefail
: "${HEALTH_URL:?HEALTH_URL ausente}"
[[ "$HEALTH_URL" == https://* ]]
curl --fail --silent --show-error --max-time 15 "$HEALTH_URL" | jq -e '.status == "ok" and (.revision | type == "string")' >/dev/null
