#!/usr/bin/env bash
set -euo pipefail

build_web="pnpm --filter @pseudobuild/web build"

# Never push Convex functions to production from a Preview or Development build.
if [[ "${VERCEL_ENV:-}" != "production" && "${CONVEX_DEPLOY_KEY:-}" == prod:* ]]; then
  echo "VERCEL_ENV=${VERCEL_ENV:-unset} with a production CONVEX_DEPLOY_KEY: skipping convex deploy and building the web app only." >&2
  echo "Scope CONVEX_DEPLOY_KEY to Production in Vercel, or set a preview deploy key for Preview." >&2
  exec bash -c "$build_web"
fi

pnpm exec convex deploy \
  --cmd "$build_web" \
  --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
