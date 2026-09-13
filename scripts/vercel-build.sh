#!/usr/bin/env bash
set -euo pipefail

if [[ -e "convex/workspaceSyncSecret.ts" ]]; then
  echo "Refusing to deploy with convex/workspaceSyncSecret.ts present; workspace sync secrets must not be written to source." >&2
  exit 1
fi

if [[ -z "${CONVEX_DEPLOY_KEY:-}" ]]; then
  echo "CONVEX_DEPLOY_KEY is unset; skipping Convex deploy and building the web app only."
  pnpm --filter @pseudobuild/web build
  exit 0
fi

pnpm exec convex deploy \
  --cmd "pnpm --filter @pseudobuild/web build" \
  --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
