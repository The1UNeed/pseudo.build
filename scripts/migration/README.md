# Migrating users and workspaces to the new Clerk app and Convex project

The old deployment used one Clerk application and one Convex project. The new ones live
under your personal accounts. Because Clerk assigns fresh user IDs in the new application,
the migration is a three-step pipeline:

```
old Clerk ──(1) export + import──▶ new Clerk   (produces old-id → new-id map)
old Convex ──(2) export──▶ JSONL ──(3) remap ids + import──▶ new Convex
```

## Requirements

| Env var | What it is |
| --- | --- |
| `OLD_CLERK_SECRET_KEY` | Secret key of the old Clerk application |
| `NEW_CLERK_SECRET_KEY` | Secret key of the new Clerk application |
| `OLD_CONVEX_DEPLOY_KEY` | Production deploy key of the old Convex project |
| `NEW_CONVEX_DEPLOY_KEY` | Production deploy key of the new Convex project |

Run everything from the repository root. All output goes to `scripts/migration/out/` which is
git-ignored.

## 1. Users: old Clerk → new Clerk

```bash
OLD_CLERK_SECRET_KEY=sk_... NEW_CLERK_SECRET_KEY=sk_... node scripts/migration/migrate-clerk-users.mjs
```

For each user in the old application the script creates a user in the new one with the same
email addresses, name, and `external_id` set to the old Clerk user ID. Email addresses are
created as verified so OAuth and magic-link sign-in work immediately. Password hashes cannot be
read through the Clerk API, so password users must use "Forgot password" once. If you want to
carry hashes over, request an export from Clerk support and pass `--password-file <json>` with
`{ "<old_user_id>": { "password_digest": "...", "password_hasher": "bcrypt" } }` entries.

The script writes `out/user-id-map.json` (`{ "user_old": "user_new" }`). It is idempotent:
users that already exist in the new app (matched by `external_id` or primary email) are reused.

## 2. Workspaces: export from old Convex

If the account lacks backup permission on the old team (`OperationNotPermitted ... deployment:backups:create`),
dump tables directly instead, then use the JSONL variant in step 3:

```bash
npx convex data users --prod --limit 1000 --format jsonl > scripts/migration/out/old-users.jsonl
npx convex data workspaces --prod --limit 1000 --format jsonl > scripts/migration/out/old-workspaces.jsonl
node scripts/migration/remap-convex-jsonl.mjs scripts/migration/out/user-id-map.json \
  users=scripts/migration/out/old-users.jsonl:scripts/migration/out/new-users.jsonl \
  workspaces=scripts/migration/out/old-workspaces.jsonl:scripts/migration/out/new-workspaces.jsonl
npx convex import --table users --format jsonLines scripts/migration/out/new-users.jsonl
npx convex import --table workspaces --format jsonLines scripts/migration/out/new-workspaces.jsonl
```

Snapshot route:

```bash
CONVEX_DEPLOY_KEY=$OLD_CONVEX_DEPLOY_KEY npx convex export --path scripts/migration/out/old-export.zip
```

## 3. Remap and import into new Convex

```bash
node scripts/migration/remap-convex-export.mjs \
  scripts/migration/out/old-export.zip \
  scripts/migration/out/user-id-map.json \
  scripts/migration/out/new-export.zip

CONVEX_DEPLOY_KEY=$NEW_CONVEX_DEPLOY_KEY npx convex import --replace-all scripts/migration/out/new-export.zip
```

The remap script rewrites `clerkUserId` in the `users` and `workspaces` tables. Rows whose
user was not migrated are dropped and listed in `out/unmapped.json` so nothing is imported under
an ID that no longer exists.

## 4. Verify

```bash
CONVEX_DEPLOY_KEY=$NEW_CONVEX_DEPLOY_KEY npx convex data workspaces --limit 5
```

Sign in to https://pseudo.build with a migrated account and confirm the workspace loads.

## 5. Decommission

Once verified, delete the old Convex project and Clerk application from their dashboards and
remove the old Vercel project.
