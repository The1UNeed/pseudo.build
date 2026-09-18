#!/usr/bin/env node
// Checks that the committed WASM was built from the runtime source in this tree.
// wasm-bindgen output is byte-identical only on the same operating system, so we
// compare recorded source hashes rather than rebuilding and diffing the binary.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const sha = (relativePath) => createHash("sha256").update(readFileSync(new URL(relativePath, root))).digest("hex");
const infoPath = "apps/web/src/runtime/wasm/pkg/build-info.json";

let info;
try {
  info = JSON.parse(readFileSync(new URL(infoPath, root), "utf8"));
} catch {
  console.error(`Missing or unreadable ${infoPath}. Run pnpm build:runtime and commit the pkg directory.`);
  process.exit(1);
}

const expected = {
  lib: sha("packages/pseudocode-runtime/src/lib.rs"),
  cargoToml: sha("packages/pseudocode-runtime/Cargo.toml"),
  cargoLock: sha("Cargo.lock"),
  wasm: sha("apps/web/src/runtime/wasm/pkg/pseudocode_runtime_bg.wasm"),
};

const stale = Object.entries(expected)
  .filter(([key, value]) => info.sha256?.[key] !== value)
  .map(([key]) => key);

if (stale.length > 0) {
  console.error(`The committed WASM does not match this source. Changed since it was built: ${stale.join(", ")}.`);
  console.error("Run pnpm build:runtime and commit apps/web/src/runtime/wasm/pkg.");
  process.exit(1);
}

console.log(`WASM matches the committed source (rustc ${info.rustc}, wasm-bindgen ${info.wasmBindgen}).`);
