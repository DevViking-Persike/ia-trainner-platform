#!/usr/bin/env bash
set -euo pipefail
: "${ZOT_USER:?ZOT_USER deve vir do Infisical}"
: "${ZOT_PASSWORD:?ZOT_PASSWORD deve vir do Infisical}"
: "${REGISTRY:?REGISTRY ausente}"
: "${IMAGE_NAME:?IMAGE_NAME ausente}"
: "${RELEASE:?RELEASE ausente}"
: "${LAYOUT:?LAYOUT ausente}"
printf '%s' "$ZOT_PASSWORD" | regctl registry login "$REGISTRY" -u "$ZOT_USER" --pass-stdin
regctl registry set "$REGISTRY" --blob-chunk 33554432 --blob-max 33554432
jq --arg tag "$RELEASE" '.manifests |= map(.annotations["org.opencontainers.image.ref.name"] = $tag)' "$LAYOUT/index.json" > "$LAYOUT/index.json.new"
mv "$LAYOUT/index.json.new" "$LAYOUT/index.json"
image="$REGISTRY/$IMAGE_NAME:$RELEASE"
regctl image copy "ocidir://$LAYOUT:$RELEASE" "$image"
[[ "$(regctl image inspect "$image" --format '{{.OS}}/{{.Architecture}}')" == linux/amd64 ]]
digest="$(regctl image digest "$image")"
[[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]
printf 'digest=%s\n' "$digest" >> "$GITHUB_OUTPUT"
printf 'Imagem verificada: %s@%s\n' "$IMAGE_NAME" "$digest"
