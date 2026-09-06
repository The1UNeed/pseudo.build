#!/usr/bin/env node
// Copies users from one Clerk application to another and writes an old→new id map.
// Usage: OLD_CLERK_SECRET_KEY=... NEW_CLERK_SECRET_KEY=... node migrate-clerk-users.mjs [--password-file file.json] [--dry-run]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.clerk.com/v1";
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const passwordFileIndex = args.indexOf("--password-file");
const passwordFile = passwordFileIndex >= 0 ? args[passwordFileIndex + 1] : null;

const oldKey = process.env.OLD_CLERK_SECRET_KEY;
const newKey = process.env.NEW_CLERK_SECRET_KEY;
if (!oldKey || !newKey) {
  console.error("Set OLD_CLERK_SECRET_KEY and NEW_CLERK_SECRET_KEY.");
  process.exit(1);
}

async function clerk(key, method, route, body) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return clerk(key, method, route, body);
  }
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`${method} ${route} → ${response.status}: ${text}`);
    error.status = response.status;
    error.body = json;
    throw error;
  }
  return json;
}

async function listAllUsers(key) {
  const users = [];
  for (let offset = 0; ; offset += 100) {
    const page = await clerk(key, "GET", `/users?limit=100&offset=${offset}&order_by=+created_at`);
    users.push(...page);
    if (page.length < 100) break;
  }
  return users;
}

function primaryEmail(user) {
  return user.email_addresses.find((email) => email.id === user.primary_email_address_id)?.email_address
    ?? user.email_addresses[0]?.email_address
    ?? null;
}

async function findExisting(newUsersByExternalId, newUsersByEmail, oldUser) {
  return newUsersByExternalId.get(oldUser.id) ?? newUsersByEmail.get(primaryEmail(oldUser)?.toLowerCase());
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const passwords = passwordFile ? JSON.parse(await readFile(passwordFile, "utf8")) : {};

  const oldUsers = await listAllUsers(oldKey);
  const newUsers = await listAllUsers(newKey);
  const newUsersByExternalId = new Map(newUsers.filter((u) => u.external_id).map((u) => [u.external_id, u]));
  const newUsersByEmail = new Map(newUsers.map((u) => [primaryEmail(u)?.toLowerCase(), u]));

  console.log(`Old app: ${oldUsers.length} users. New app: ${newUsers.length} users.`);

  const idMap = {};
  const failures = [];

  for (const oldUser of oldUsers) {
    const existing = await findExisting(newUsersByExternalId, newUsersByEmail, oldUser);
    if (existing) {
      idMap[oldUser.id] = existing.id;
      console.log(`reuse   ${oldUser.id} → ${existing.id}`);
      continue;
    }

    const emails = oldUser.email_addresses.map((email) => email.email_address);
    if (emails.length === 0) {
      failures.push({ id: oldUser.id, reason: "no email address" });
      continue;
    }

    const payload = {
      external_id: oldUser.id,
      email_address: emails,
      first_name: oldUser.first_name ?? undefined,
      last_name: oldUser.last_name ?? undefined,
      username: oldUser.username ?? undefined,
      public_metadata: oldUser.public_metadata ?? {},
      private_metadata: oldUser.private_metadata ?? {},
      unsafe_metadata: oldUser.unsafe_metadata ?? {},
      skip_password_checks: true,
      skip_password_requirement: true,
      created_at: oldUser.created_at ? new Date(oldUser.created_at).toISOString() : undefined,
      ...(passwords[oldUser.id] ?? {}),
    };

    if (dryRun) {
      console.log(`create  ${oldUser.id} (${emails[0]})`);
      continue;
    }

    try {
      const created = await clerk(newKey, "POST", "/users", payload);
      idMap[oldUser.id] = created.id;
      console.log(`create  ${oldUser.id} → ${created.id}`);
    } catch (error) {
      failures.push({ id: oldUser.id, reason: error.message });
      console.error(`fail    ${oldUser.id}: ${error.message}`);
    }
  }

  await writeFile(path.join(outDir, "user-id-map.json"), JSON.stringify(idMap, null, 2));
  await writeFile(path.join(outDir, "clerk-failures.json"), JSON.stringify(failures, null, 2));
  console.log(`\nMapped ${Object.keys(idMap).length} users, ${failures.length} failures. Wrote out/user-id-map.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
