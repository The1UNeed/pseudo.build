#!/usr/bin/env node
// Rewrites clerkUserId in JSONL table dumps (from `npx convex data <table> --format jsonl`)
// using an old→new id map, and strips system fields so `npx convex import` accepts them.
// Usage: node remap-convex-jsonl.mjs <user-id-map.json> <table>=<in.jsonl>:<out.jsonl> ...

import { readFile, writeFile } from "node:fs/promises";

const [mapFile, ...tables] = process.argv.slice(2);
if (!mapFile || tables.length === 0) {
  console.error("Usage: remap-convex-jsonl.mjs <user-id-map.json> users=in.jsonl:out.jsonl workspaces=in.jsonl:out.jsonl");
  process.exit(1);
}

const idMap = JSON.parse(await readFile(mapFile, "utf8"));
const unmapped = [];

for (const spec of tables) {
  const [table, files] = spec.split("=");
  const [input, output] = files.split(":");
  const lines = (await readFile(input, "utf8")).split("\n").filter(Boolean);
  const kept = [];
  for (const line of lines) {
    const { _id, _creationTime, ...doc } = JSON.parse(line);
    const next = idMap[doc.clerkUserId];
    if (!next) {
      unmapped.push({ table, _id, clerkUserId: doc.clerkUserId });
      continue;
    }
    kept.push(JSON.stringify({ ...doc, clerkUserId: next }));
  }
  await writeFile(output, kept.join("\n") + (kept.length ? "\n" : ""));
  console.log(`${table}: kept ${kept.length}, dropped ${lines.length - kept.length} → ${output}`);
}

await writeFile("scripts/migration/out/unmapped.json", JSON.stringify(unmapped, null, 2));
console.log(`Unmapped rows: ${unmapped.length}`);
