#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${WORKSPACE_SYNC_SECRET:-}" ]]; then
  echo "Missing WORKSPACE_SYNC_SECRET" >&2
  exit 1
fi

node - <<'NODE'
const fs = require("fs");
const secret = process.env.WORKSPACE_SYNC_SECRET;

fs.writeFileSync(
  "convex/workspaceSyncSecret.ts",
  `export const workspaceSyncSecret = ${JSON.stringify(secret)};\n`,
);
NODE

pnpm exec convex deploy \
  --cmd "pnpm --filter @pseudoeditor/web build" \
  --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
