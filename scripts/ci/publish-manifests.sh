#!/usr/bin/env bash
set -euo pipefail
: "${RELEASE:?RELEASE ausente}"
: "${IMAGE_DIGEST:?IMAGE_DIGEST ausente}"
: "${IMAGE_NAME:?IMAGE_NAME ausente}"
: "${IMAGE_PULL_REGISTRY:?IMAGE_PULL_REGISTRY ausente}"
[[ "$RELEASE" =~ ^prod-[a-f0-9]+-[0-9]+-[0-9]+$ ]]
[[ "$IMAGE_DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]]
source_dir="$(pwd)/deploy/kubernetes"
task_tmp="$(mktemp -d)"
cleanup() {
  git worktree remove --force "$task_tmp/manifests" >/dev/null 2>&1 || true
  rm -rf "$task_tmp"
}
trap cleanup EXIT
git config user.name 'ia-trainner-ci'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
remote_ref="$(git ls-remote --heads origin refs/heads/gitops)"
if [[ -n "$remote_ref" ]]; then
  git fetch origin gitops
  git worktree add --detach "$task_tmp/manifests" FETCH_HEAD
else
  git worktree add --detach "$task_tmp/manifests" HEAD
  git -C "$task_tmp/manifests" switch --orphan gitops-init
fi
target="$task_tmp/manifests"
git -C "$target" ls-files -z | while IFS= read -r -d '' tracked; do rm -f -- "$target/$tracked"; done
cp "$source_dir"/*.yaml "$target/"
python3 - "$target" <<'PY'
import json, os, pathlib, sys
root = pathlib.Path(sys.argv[1])
# All replacement values are serialized as YAML-compatible JSON scalars.
image = os.environ['IMAGE_PULL_REGISTRY'] + '/' + os.environ['IMAGE_NAME']
replacements = {
    '__IMAGE_NAME__': json.dumps(image),
    '__IMAGE_DIGEST__': json.dumps(os.environ['IMAGE_DIGEST']),
    '__RELEASE__': json.dumps(os.environ['RELEASE']),
    '__JOB_IMAGE__': json.dumps(image + '@' + os.environ['IMAGE_DIGEST']),
}
for path in root.glob('*.yaml'):
    text = path.read_text()
    for key, value in replacements.items():
        text = text.replace(key, value)
    path.write_text(text)
PY
kubectl kustomize "$target" > /dev/null
git -C "$target" add --all
git -C "$target" diff --cached --quiet && exit 0
git -C "$target" commit -m "deploy: $IMAGE_NAME $RELEASE"
# Serialize releases through workflow concurrency. Fail on an unexpected remote update.
git -C "$target" push origin HEAD:gitops
