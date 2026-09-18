#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/apps/web/src/runtime/wasm/pkg"
CARGO_HOME_DIR="${CARGO_HOME:-$HOME/.cargo}"
TARGET="wasm32-unknown-unknown"
export PATH="$CARGO_HOME_DIR/bin:$PATH"

# Versions come from rust-toolchain.toml and Cargo.lock so the build can be reproduced.
TOOLCHAIN="$(sed -n 's/^channel = "\(.*\)"$/\1/p' "$ROOT_DIR/rust-toolchain.toml")"
WASM_BINDGEN_VERSION="$(grep -A1 '^name = "wasm-bindgen"$' "$ROOT_DIR/Cargo.lock" | sed -n 's/^version = "\(.*\)"$/\1/p')"

if command -v rustup >/dev/null 2>&1; then
  if ! rustup target list --toolchain "$TOOLCHAIN" --installed 2>/dev/null | grep -qx "$TARGET"; then
    echo "Installing Rust $TOOLCHAIN with target $TARGET..."
    rustup toolchain install "$TOOLCHAIN" --profile minimal --target "$TARGET"
  fi
  CARGO=(rustup run "$TOOLCHAIN" cargo)
elif rustc --version | grep -q "^rustc $TOOLCHAIN "; then
  CARGO=(cargo)
else
  echo "Rust $TOOLCHAIN is required (found: $(rustc --version)). Install rustup to get it automatically."
  exit 1
fi

if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "wasm-bindgen CLI is required. Install it with:"
  echo "  cargo install wasm-bindgen-cli --version $WASM_BINDGEN_VERSION --locked"
  exit 1
fi
if [ "$(wasm-bindgen --version)" != "wasm-bindgen $WASM_BINDGEN_VERSION" ]; then
  echo "wasm-bindgen $WASM_BINDGEN_VERSION is required (found: $(wasm-bindgen --version)). Install it with:"
  echo "  cargo install wasm-bindgen-cli --version $WASM_BINDGEN_VERSION --locked --force"
  exit 1
fi

# Strip machine-specific paths so any checkout produces the same binary.
# The 8 MB stack covers the runtime's nesting limit (MAX_NESTING_DEPTH in lib.rs); the 1 MB default overflows near 1,400 nested IFs.
export RUSTFLAGS="--remap-path-prefix=$ROOT_DIR=/pseudo.build --remap-path-prefix=$CARGO_HOME_DIR=/cargo -C link-arg=-zstack-size=8388608"
(cd "$ROOT_DIR" && "${CARGO[@]}" build -p pseudocode-runtime --target "$TARGET" --release --locked)
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
wasm-bindgen \
  "$ROOT_DIR/target/$TARGET/release/pseudocode_runtime.wasm" \
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
const fetchNeedle = "module_or_path = fetch(module_or_path);";

for (const text of [needle, fetchNeedle]) {
  if (!source.includes(text)) {
    console.error(`Glue patch failed: wasm-bindgen output no longer contains:\n${text}`);
    process.exit(1);
  }
}
fs.writeFileSync(
  path,
  source.replace(needle, replacement).replace(fetchNeedle, "module_or_path = globalThis.fetch(module_or_path);"),
);
JS

# Record what this binary was built from. Rebuilds are byte-identical on the same
# OS but not across operating systems, so CI checks these hashes instead of the bytes.
RUSTC_VERSION="$("${CARGO[@]}" --version | awk '{print $2}')"
node - "$ROOT_DIR" "$OUT_DIR" "$RUSTC_VERSION" "$WASM_BINDGEN_VERSION" <<'JS'
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const [root, outDir, rustc, wasmBindgen] = process.argv.slice(2);
const sha = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const info = {
  note: "Written by scripts/build-runtime-wasm.sh, verified by scripts/check-wasm-provenance.mjs.",
  rustc,
  wasmBindgen,
  sha256: {
    lib: sha(path.join(root, "packages/pseudocode-runtime/src/lib.rs")),
    cargoToml: sha(path.join(root, "packages/pseudocode-runtime/Cargo.toml")),
    cargoLock: sha(path.join(root, "Cargo.lock")),
    wasm: sha(path.join(outDir, "pseudocode_runtime_bg.wasm")),
  },
};
fs.writeFileSync(path.join(outDir, "build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
console.log("Wrote pkg/build-info.json");
JS
