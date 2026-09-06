#!/usr/bin/env node
// Rewrites clerkUserId in a Convex export zip using an old→new id map.
// Usage: node remap-convex-export.mjs <old-export.zip> <user-id-map.json> <new-export.zip>

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [input, mapFile, output] = process.argv.slice(2);
if (!input || !mapFile || !output) {
  console.error("Usage: remap-convex-export.mjs <old-export.zip> <user-id-map.json> <new-export.zip>");
  process.exit(1);
}

const TABLES_WITH_USER_IDS = ["users", "workspaces"];
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");

async function main() {
  const idMap = JSON.parse(await readFile(mapFile, "utf8"));
  const work = await mkdtemp(path.join(os.tmpdir(), "convex-remap-"));
  execFileSync("unzip", ["-q", path.resolve(input), "-d", work]);

  const unmapped = [];
  for (const table of TABLES_WITH_USER_IDS) {
    const file = path.join(work, table, "documents.jsonl");
    let raw;
    try {
      raw = await readFile(file, "utf8");
    } catch {
      console.warn(`table ${table} not present in export, skipping`);
      continue;
    }

    const kept = [];
    for (const line of raw.split("\n").filter(Boolean)) {
      const doc = JSON.parse(line);
      const next = idMap[doc.clerkUserId];
      if (!next) {
        unmapped.push({ table, _id: doc._id, clerkUserId: doc.clerkUserId });
        continue;
      }
      kept.push(JSON.stringify({ ...doc, clerkUserId: next }));
    }
    await writeFile(file, kept.join("\n") + (kept.length ? "\n" : ""));
    console.log(`${table}: kept ${kept.length}, dropped ${raw.split("\n").filter(Boolean).length - kept.length}`);
  }

  // Drop generated documents whose ids would collide; Convex import assigns new ids when --replace-all is used.
  const entries = await readdir(work);
  await rm(path.resolve(output), { force: true });
  execFileSync("zip", ["-qr", path.resolve(output), "--", ...entries], { cwd: work });
  await writeFile(path.join(outDir, "unmapped.json"), JSON.stringify(unmapped, null, 2));
  await rm(work, { recursive: true, force: true });
  console.log(`Wrote ${output}. Unmapped rows: ${unmapped.length} (see out/unmapped.json)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
