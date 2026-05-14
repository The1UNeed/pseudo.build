#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/apps/web/src/runtime/wasm/pkg"

if ! rustup target list --installed | grep -qx "wasm32-unknown-unknown"; then
  echo "Installing Rust target wasm32-unknown-unknown..."
  rustup target add wasm32-unknown-unknown
fi

if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "wasm-bindgen CLI is required. Install it with:"
  echo "  cargo install wasm-bindgen-cli"
  exit 1
fi

cargo build -p pseudocode-runtime --target wasm32-unknown-unknown --release
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
wasm-bindgen \
  "$ROOT_DIR/target/wasm32-unknown-unknown/release/pseudocode_runtime.wasm" \
  --target web \
  --out-dir "$OUT_DIR" \
  --out-name pseudocode_runtime

node - "$OUT_DIR/pseudocode_runtime.js" <<'JS'
const fs = require("node:fs");

const path = process.argv[2];
const source = fs.readFileSync(path, "utf8");
const needle = `    if (module_or_path === undefined) {
        module_or_path = new URL('pseudocode_runtime_bg.wasm', import.meta.url);
    }
`;
const replacement = `    if (module_or_path === undefined) {
        module_or_path = new URL('pseudocode_runtime_bg.wasm', import.meta.url);
    }
    const __runtime_location = globalThis.location;
    const __runtime_origin =
        __runtime_location?.origin && __runtime_location.origin !== 'null'
            ? __runtime_location.origin
            : __runtime_location?.href?.startsWith('blob:')
              ? new URL(__runtime_location.href.slice(5)).origin
              : \`\${__runtime_location?.protocol}//\${__runtime_location?.host}\`;
    if (typeof module_or_path === 'string') {
        if (module_or_path.startsWith('/')) {
            module_or_path = new URL(module_or_path, __runtime_origin);
        }
    } else if (typeof Request === 'function' && module_or_path instanceof Request && module_or_path.url.startsWith('/')) {
        module_or_path = new Request(new URL(module_or_path.url, __runtime_origin), module_or_path);
    } else if (
        module_or_path &&
        !(typeof Response === 'function' && module_or_path instanceof Response) &&
        typeof module_or_path.toString === 'function'
    ) {
        const __runtime_module_path =
            typeof module_or_path.href === 'string'
                ? module_or_path.href
                : typeof module_or_path.url === 'string'
                  ? module_or_path.url
                  : module_or_path.toString();
        if (__runtime_module_path.startsWith('/')) {
            module_or_path = new URL(__runtime_module_path, __runtime_origin);
        }
    }
`;

const patchedSource = (source.includes(replacement) ? source : source.replace(needle, replacement))
  .replace("module_or_path = fetch(module_or_path);", "module_or_path = globalThis.fetch(module_or_path);");
fs.writeFileSync(path, patchedSource);
JS
