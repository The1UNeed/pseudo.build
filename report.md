# Security Review: pseudoeditor.dev

## Scope

Deep repository security review of the PseudoEditor public website, browser app, deployment scripts, Convex workspace backend, package manifests, and supporting packages.

- Scan mode: deep_repository
- Target kind: git_worktree
- Target ID: pseudoeditor.dev
- Revision: 3063785c328107732e7988020c534d1b99b8789c
- Snapshot digest: codex-security-snapshot/v1:sha256:12a10a6b5e1c8afb6cf61d3bc22f5d4fa0fa286ac9de4f91644ba693397018cc
- Inventory strategy: repository
- Included paths: .
- Excluded paths: node_modules, apps/web/.next, dist, coverage, target
- Runtime or test status: Static validation plus local package audit; no live production Clerk, Convex, Vercel, or exploit reproduction was performed.
- Artifacts reviewed: artifacts/02_discovery/deep_review_input.jsonl, artifacts/02_discovery/finding_discovery_report.md, artifacts/04_reconciliation/deduped_candidates.jsonl, artifacts/05_findings/validation_summary.md, artifacts/05_findings/attack_path_analysis_report.md
- Scan context: Threat model was generated during the scan from repository source and worker-specific discovery outputs.

Limitations and exclusions:
- Secret values were intentionally not copied into scan artifacts or the final report.
- The scan did not exercise live production services or third-party control planes.
- Dependency-advisory exploitability is calibrated from local package audit and repository reachability, not a live exploit PoC.
- Excluded node_modules: Third-party installed dependency source was reviewed through lockfile/package audit rather than full vendored source scan.
- Excluded apps/web/.next: Generated build output was excluded from source review.
- Excluded dist, coverage, target: Generated build/test outputs were excluded from source review.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 4 |
| Severity mix | high: 2, medium: 2 |
| Confidence mix | high: 2, medium: 2 |
| Coverage | complete |
| Validation mode | centralized static validation with redacted artifact checks and local pnpm audit |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

The main public risk is hostile internet traffic against the Next.js site, hostile authenticated users against workspace sync, and secret leakage through deployment/build workflows. Clerk identity, Convex workspace data, build secrets, local keyless credentials, and website availability are the primary assets.

### Assets

- Clerk secret keys and sessions
- Workspace data keyed by Clerk user ID
- WORKSPACE_SYNC_SECRET and Convex data
- Public website availability
- Deployment source bundles and preview deployment artifacts

### Trust Boundaries

- Internet requests to public App Router and proxy handling
- Authenticated browser clients to `/api/workspace`
- Next server route to Convex functions
- Build/deploy environment to source files and third-party deployment endpoint
- Browser-local compiler/runtime to server-side persistence

### Attacker Capabilities

- Send unauthenticated crafted HTTP requests to public pages
- Create or use a signed-in account and submit arbitrary workspace JSON
- Exploit or observe accidentally uploaded deployment source artifacts
- Use a leaked shared workspace secret to call Convex functions directly

### Security Objectives

- Do not package ignored local credential directories
- Do not write live secrets into tracked source files
- Bind workspace access to authenticated identity instead of caller-supplied IDs
- Validate and bound user-controlled persisted workspace data
- Keep public framework dependencies patched against high-severity advisories

### Assumptions

- Cloud workspace sync is enabled only when Clerk and Convex environment variables are present
- The production site is internet-facing
- Convex functions may be reachable through Convex HTTP/RPC mechanisms by clients that know function names and required arguments

## Findings

| Finding | Severity | Confidence |
| --- | --- | --- |
| [Workspace sync secret can become source and authorize caller-selected users](#finding-1) | high | high |
| [Pinned `next@16.1.6` leaves public App Router in high advisory ranges](#finding-2) | high | medium |
| [Custom deploy helper uploads ignored Clerk keyless credentials](#finding-3) | medium | high |
| [Workspace sync persists arbitrary unbounded JSON for authenticated users](#finding-4) | medium | medium |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] Workspace sync secret can become source and authorize caller-selected users

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Source tracing and git metadata show the build writes the shared secret into a tracked Convex module and the Convex RPCs authorize all workspace objects with that one secret. |
| Category | Authorization bypass / IDOR via shared secret |
| CWE | CWE-522, CWE-639, CWE-862 |
| Affected lines | vercel.json:4, scripts/vercel-build.sh:9-16, convex/workspaceSyncSecret.ts:1, convex/workspaces.ts:5-8, convex/workspaces.ts:12-25, convex/workspaces.ts:29-80, apps/web/src/app/api/workspace/route.ts:65-80 |

#### Summary

The workspace sync boundary relies on a reusable `WORKSPACE_SYNC_SECRET` that the deployment build writes into a tracked Convex source module. The Convex functions then accept `clerkUserId` values supplied in RPC arguments after only the shared-secret check, so disclosure of that one secret can let a caller read or overwrite other users' workspaces.

#### Root Cause

The violated invariant is that workspace object selection must be bound to the authenticated principal at the backend boundary. Instead, Convex uses a global bearer secret and trusts the caller to name the Clerk user whose workspace should be read or written.

**Build writes the environment secret into source** — `scripts/vercel-build.sh:9-16`

The build script serializes `WORKSPACE_SYNC_SECRET` into `convex/workspaceSyncSecret.ts`.

```bash
node - <<'NODE'
const fs = require("fs");
const secret = process.env.WORKSPACE_SYNC_SECRET;

fs.writeFileSync(
  "convex/workspaceSyncSecret.ts",
  `export const workspaceSyncSecret = ${JSON.stringify(secret)};\n`,
);
```

**Convex functions trust a global shared secret** — `convex/workspaces.ts:5-8`

The server-side authorization check accepts the supplied `serverSecret` if it equals either the environment value or generated source constant.

```typescript
function requireServerSecret(serverSecret: string) {
  const expected = process.env.WORKSPACE_SYNC_SECRET ?? workspaceSyncSecret;
  if (!expected || serverSecret !== expected) {
    throw new Error("Unauthorized workspace sync request.");
```

**Read operation selects caller-supplied Clerk user ID** — `convex/workspaces.ts:12-25`

`getCurrent` checks only the shared secret before querying by the caller-provided `clerkUserId` argument.

```typescript
export const getCurrent = queryGeneric({
  args: {
    serverSecret: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.clerkUserId))
      .unique();

    return workspace?.workspace ?? null;
```

**Write operation selects caller-supplied user object** — `convex/workspaces.ts:29-80`

`saveCurrent` checks only the shared secret before updating or inserting rows for `args.user.clerkUserId`.

```typescript
export const saveCurrent = mutationGeneric({
  args: {
    serverSecret: v.string(),
    user: v.object({
      clerkUserId: v.string(),
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
    }),
    workspace: v.any(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const now = Date.now();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.user.clerkUserId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.user.email,
        firstName: args.user.firstName,
        lastName: args.user.lastName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("users", {
        ...args.user,
        updatedAt: now,
      });
    }

    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.user.clerkUserId))
      .unique();

    if (existingWorkspace) {
      await ctx.db.patch(existingWorkspace._id, {
        workspace: args.workspace,
        updatedAt: now,
      });
      return existingWorkspace._id;
    }

    return await ctx.db.insert("workspaces", {
      clerkUserId: args.user.clerkUserId,
      workspace: args.workspace,
      updatedAt: now,
    });
```

#### Validation

The destination secret module exists, is tracked, and is not ignored. The current placeholder is `null`, but the build script overwrites it with the live `WORKSPACE_SYNC_SECRET` before `convex deploy`. The Convex functions have no Convex-auth principal binding and use caller-supplied user IDs.

Validation method: static source trace and git metadata check

**Vercel build invokes the secret-writing script** — `vercel.json:1-5`

`vercel.json` runs `scripts/vercel-build.sh` for deployment builds.

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "bash scripts/vercel-build.sh",
  "outputDirectory": "apps/web/.next"
```

**Build writes the environment secret into source** — `scripts/vercel-build.sh:9-16`

The build script serializes `WORKSPACE_SYNC_SECRET` into `convex/workspaceSyncSecret.ts`.

```bash
node - <<'NODE'
const fs = require("fs");
const secret = process.env.WORKSPACE_SYNC_SECRET;

fs.writeFileSync(
  "convex/workspaceSyncSecret.ts",
  `export const workspaceSyncSecret = ${JSON.stringify(secret)};\n`,
);
```

**Tracked Convex secret module** — `convex/workspaceSyncSecret.ts:1`

The destination is a tracked source file; current content is a null placeholder, but the build overwrites it with the live secret.

```typescript
export const workspaceSyncSecret: string | null = null;
```

**Convex functions trust a global shared secret** — `convex/workspaces.ts:5-8`

The server-side authorization check accepts the supplied `serverSecret` if it equals either the environment value or generated source constant.

```typescript
function requireServerSecret(serverSecret: string) {
  const expected = process.env.WORKSPACE_SYNC_SECRET ?? workspaceSyncSecret;
  if (!expected || serverSecret !== expected) {
    throw new Error("Unauthorized workspace sync request.");
```

**Read operation selects caller-supplied Clerk user ID** — `convex/workspaces.ts:12-25`

`getCurrent` checks only the shared secret before querying by the caller-provided `clerkUserId` argument.

```typescript
export const getCurrent = queryGeneric({
  args: {
    serverSecret: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.clerkUserId))
      .unique();

    return workspace?.workspace ?? null;
```

**Write operation selects caller-supplied user object** — `convex/workspaces.ts:29-80`

`saveCurrent` checks only the shared secret before updating or inserting rows for `args.user.clerkUserId`.

```typescript
export const saveCurrent = mutationGeneric({
  args: {
    serverSecret: v.string(),
    user: v.object({
      clerkUserId: v.string(),
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
    }),
    workspace: v.any(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const now = Date.now();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.user.clerkUserId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.user.email,
        firstName: args.user.firstName,
        lastName: args.user.lastName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("users", {
        ...args.user,
        updatedAt: now,
      });
    }

    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.user.clerkUserId))
      .unique();

    if (existingWorkspace) {
      await ctx.db.patch(existingWorkspace._id, {
        workspace: args.workspace,
        updatedAt: now,
      });
      return existingWorkspace._id;
    }

    return await ctx.db.insert("workspaces", {
      clerkUserId: args.user.clerkUserId,
      workspace: args.workspace,
      updatedAt: now,
    });
```

Evidence:
- Validation artifact: `artifacts/05_findings/DSS-CAND-002/validation_artifacts/workspace-secret-file-status.txt`.

Counterevidence and remaining uncertainty:
- The ordinary Next route does derive Clerk identity from route auth before forwarding to Convex, so ordinary callers cannot choose another `clerkUserId` through that route without the shared secret.

#### Dataflow

build secret -\> generated Convex source/global expected value -\> `serverSecret` check -\> caller-selected `clerkUserId` -\> workspace query/patch/insert

- **Source:** leaked `WORKSPACE_SYNC_SECRET` or generated source module

- **Sink:** Convex workspace rows selected by caller-supplied Clerk IDs

- **Outcome:** cross-user workspace read or overwrite

**Convex functions trust a global shared secret** — `convex/workspaces.ts:5-8`

The server-side authorization check accepts the supplied `serverSecret` if it equals either the environment value or generated source constant.

```typescript
function requireServerSecret(serverSecret: string) {
  const expected = process.env.WORKSPACE_SYNC_SECRET ?? workspaceSyncSecret;
  if (!expected || serverSecret !== expected) {
    throw new Error("Unauthorized workspace sync request.");
```

**Read operation selects caller-supplied Clerk user ID** — `convex/workspaces.ts:12-25`

`getCurrent` checks only the shared secret before querying by the caller-provided `clerkUserId` argument.

```typescript
export const getCurrent = queryGeneric({
  args: {
    serverSecret: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.clerkUserId))
      .unique();

    return workspace?.workspace ?? null;
```

**Write operation selects caller-supplied user object** — `convex/workspaces.ts:29-80`

`saveCurrent` checks only the shared secret before updating or inserting rows for `args.user.clerkUserId`.

```typescript
export const saveCurrent = mutationGeneric({
  args: {
    serverSecret: v.string(),
    user: v.object({
      clerkUserId: v.string(),
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
    }),
    workspace: v.any(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const now = Date.now();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.user.clerkUserId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.user.email,
        firstName: args.user.firstName,
        lastName: args.user.lastName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("users", {
        ...args.user,
        updatedAt: now,
      });
    }

    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.user.clerkUserId))
      .unique();

    if (existingWorkspace) {
      await ctx.db.patch(existingWorkspace._id, {
        workspace: args.workspace,
        updatedAt: now,
      });
      return existingWorkspace._id;
    }

    return await ctx.db.insert("workspaces", {
      clerkUserId: args.user.clerkUserId,
      workspace: args.workspace,
      updatedAt: now,
    });
```

#### Reachability

The normal web route is protected, but the Convex backend functions themselves are a separate RPC boundary guarded by a single bearer secret.

- **Attacker:** actor with the leaked sync secret or source bundle

- **Entry point:** Convex `workspaces.getCurrent` or `workspaces.saveCurrent`

- **Outcome:** read or modify another user's saved workspace

Preconditions:
- The shared secret or generated source constant is disclosed.
- Convex functions are deployed with the shared-secret path reachable.

#### Severity

**High** — A single leaked workspace sync secret can cross the user-data boundary and read or overwrite arbitrary users' saved workspaces. The deployment flow increases leak likelihood by writing that secret into tracked source during build.

Severity would drop if Convex functions bind identity server-side and the build no longer writes live secrets into source; it would rise if the generated source file has already been uploaded to public artifacts or committed with a real secret.

#### Remediation

Stop writing `WORKSPACE_SYNC_SECRET` into source. Store it only as a Convex environment variable or remove the shared-secret pattern entirely. Bind Convex workspace reads/writes to Convex/Clerk-authenticated identity inside the Convex function and reject caller-provided `clerkUserId` for object selection. Add `.gitignore` and CI checks that fail if generated secret files differ from a safe placeholder.

Tests:
- Unit-test Convex functions so a caller cannot provide a different `clerkUserId` than the authenticated identity.
- CI-test that `scripts/vercel-build.sh` does not modify tracked source or persist secret values.

Preventive controls:
- Use per-request identity claims instead of global bearer secrets for tenant object selection.
- Add secret scanning for `workspaceSyncSecret.ts` and `WORKSPACE_SYNC_SECRET` values.

<a id="finding-2"></a>

### [2] Pinned `next@16.1.6` leaves public App Router in high advisory ranges

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | medium |
| Confidence rationale | Local `pnpm audit --prod` and source version evidence place `next@16.1.6` in high-severity advisory ranges, but no live exploit was run against the deployed site. |
| Category | Known vulnerable dependency / framework DoS |
| CWE | CWE-400 |
| Affected lines | apps/web/package.json:17-31, package.json:20-23, pnpm-lock.yaml:2434, apps/web/src/app/(public)/page.tsx:28-49, apps/web/src/app/(public)/blog/\[slug\]/page.tsx:40-48, apps/web/src/app/(public)/docs/\[slug\]/page.tsx:39-47, apps/web/src/proxy.ts:13-25 |

#### Summary

The public web app pins `next@16.1.6`, and local production dependency audit maps that exact version to multiple high-severity Next.js advisories, including Server Components denial-of-service and Middleware/Proxy bypass classes. The repository exposes unauthenticated App Router pages, so framework-level request handling is publicly reachable before app code can defend it.

#### Root Cause

The violated invariant is that internet-facing framework code must not remain in known high-severity vulnerable ranges. The package and lockfile keep the site on `next@16.1.6`, while public App Router and proxy surfaces are present.

**Web app pins vulnerable Next.js version** — `apps/web/package.json:17-31`

`@pseudoeditor/web` pins `next` to `16.1.6`.

```json
  "dependencies": {
    "@clerk/nextjs": "^7.3.1",
    "@igcse/compiler": "workspace:*",
    "@igcse/workspace": "workspace:*",
    "@monaco-editor/react": "^4.7.0",
    "@vercel/analytics": "^2.0.1",
    "@vercel/speed-insights": "^2.0.0",
    "@xyflow/react": "^12.10.2",
    "convex": "^1.36.1",
    "idb": "^8.0.3",
    "lucide-react": "^0.577.0",
    "monaco-editor": "^0.55.1",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
```

**Workspace root pins same Next.js version** — `package.json:20-23`

The root dev dependency also pins `next` to `16.1.6`.

```json
  "devDependencies": {
    "convex": "^1.36.1",
    "next": "16.1.6"
  },
```

**Public App Router home page** — `apps/web/src/app/(public)/page.tsx:28-49`

The public home page is an App Router server component surface.

```tsx
export const metadata: Metadata = {
  title: homeSeoTitle,
  description: homeSeoDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: productName,
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: [{ url: "/icon.png?v=2", width: 512, height: 512, alt: "PseudoEditor app icon" }],
  },
  twitter: {
    card: "summary",
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: ["/icon.png?v=2"],
  },
};
```

**Public dynamic blog App Router page** — `apps/web/src/app/(public)/blog/\[slug\]/page.tsx:40-48`

Public dynamic App Router page rendering is reachable without authentication.

```tsx
export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const structuredData = [
```

**Public dynamic docs App Router page** — `apps/web/src/app/(public)/docs/\[slug\]/page.tsx:39-47`

Public dynamic App Router page rendering is reachable without authentication.

```tsx
export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDoc(slug);

  if (!doc) {
    notFound();
  }

  const structuredData = [
```

**Next proxy surface exists** — `apps/web/src/proxy.ts:13-25`

The app defines a Next proxy/matcher using Clerk middleware when Clerk config is present, which is relevant to proxy-bypass advisory classes.

```typescript
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkProxy) {
    return NextResponse.next();
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
```

#### Validation

`pnpm audit --prod` reported `next@16.1.6` as affected by high-severity advisories. Public App Router pages and a proxy surface were found in source. The workspace API has route-local auth, which lowers the proxy-bypass impact for that endpoint but does not remove framework-level availability exposure.

Validation method: local package audit plus static source trace

**Web app pins vulnerable Next.js version** — `apps/web/package.json:17-31`

`@pseudoeditor/web` pins `next` to `16.1.6`.

```json
  "dependencies": {
    "@clerk/nextjs": "^7.3.1",
    "@igcse/compiler": "workspace:*",
    "@igcse/workspace": "workspace:*",
    "@monaco-editor/react": "^4.7.0",
    "@vercel/analytics": "^2.0.1",
    "@vercel/speed-insights": "^2.0.0",
    "@xyflow/react": "^12.10.2",
    "convex": "^1.36.1",
    "idb": "^8.0.3",
    "lucide-react": "^0.577.0",
    "monaco-editor": "^0.55.1",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
```

**Workspace root pins same Next.js version** — `package.json:20-23`

The root dev dependency also pins `next` to `16.1.6`.

```json
  "devDependencies": {
    "convex": "^1.36.1",
    "next": "16.1.6"
  },
```

**Public App Router home page** — `apps/web/src/app/(public)/page.tsx:28-49`

The public home page is an App Router server component surface.

```tsx
export const metadata: Metadata = {
  title: homeSeoTitle,
  description: homeSeoDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: productName,
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: [{ url: "/icon.png?v=2", width: 512, height: 512, alt: "PseudoEditor app icon" }],
  },
  twitter: {
    card: "summary",
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: ["/icon.png?v=2"],
  },
};
```

**Public dynamic blog App Router page** — `apps/web/src/app/(public)/blog/\[slug\]/page.tsx:40-48`

Public dynamic App Router page rendering is reachable without authentication.

```tsx
export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const structuredData = [
```

**Public dynamic docs App Router page** — `apps/web/src/app/(public)/docs/\[slug\]/page.tsx:39-47`

Public dynamic App Router page rendering is reachable without authentication.

```tsx
export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDoc(slug);

  if (!doc) {
    notFound();
  }

  const structuredData = [
```

**Next proxy surface exists** — `apps/web/src/proxy.ts:13-25`

The app defines a Next proxy/matcher using Clerk middleware when Clerk config is present, which is relevant to proxy-bypass advisory classes.

```typescript
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkProxy) {
    return NextResponse.next();
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
```

Evidence:
- High Next advisories from local audit: Next.js has a Denial of Service with Server Components; Next.js Vulnerable to Denial of Service with Server Components; Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes - Incomplete Fix Follow-Up; Next.js vulnerable to Denial of Service via connection exhaustion in applications using Cache Components; Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades; Next.js has a Middleware / Proxy bypass through dynamic route parameter injection; Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes; Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n
- Advisory URLs: https://github.com/advisories/GHSA-q4gf-8mx6-v5v3, https://github.com/advisories/GHSA-8h8q-6873-q5fj, https://github.com/advisories/GHSA-26hh-7cqf-hhc6, https://github.com/advisories/GHSA-mg66-mrh9-m8jx, https://github.com/advisories/GHSA-c4j6-fc7j-m34r, https://github.com/advisories/GHSA-492v-c6pp-mqqv, https://github.com/advisories/GHSA-267c-6grr-h53f, https://github.com/advisories/GHSA-36qx-fr4f-26g5
- Validation artifacts: `artifacts/05_findings/DSS-CAND-004/validation_artifacts/pnpm-audit-prod.json` and `next-high-advisory-summary.json`.

Counterevidence and remaining uncertainty:
- No live exploit was run. Proxy bypass impact is reduced for `/api/workspace` because that route performs route-local Clerk verification.

#### Dataflow

public HTTP request -\> Next App Router/proxy runtime at `next@16.1.6` -\> vulnerable framework advisory path -\> process/resource exhaustion or proxy-control bypass depending on advisory

- **Source:** unauthenticated public request

- **Sink:** Next.js framework request handling

- **Outcome:** denial of service risk, with proxy-bypass impact dependent on route-level controls

**Web app pins vulnerable Next.js version** — `apps/web/package.json:17-31`

`@pseudoeditor/web` pins `next` to `16.1.6`.

```json
  "dependencies": {
    "@clerk/nextjs": "^7.3.1",
    "@igcse/compiler": "workspace:*",
    "@igcse/workspace": "workspace:*",
    "@monaco-editor/react": "^4.7.0",
    "@vercel/analytics": "^2.0.1",
    "@vercel/speed-insights": "^2.0.0",
    "@xyflow/react": "^12.10.2",
    "convex": "^1.36.1",
    "idb": "^8.0.3",
    "lucide-react": "^0.577.0",
    "monaco-editor": "^0.55.1",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
```

**Public App Router home page** — `apps/web/src/app/(public)/page.tsx:28-49`

The public home page is an App Router server component surface.

```tsx
export const metadata: Metadata = {
  title: homeSeoTitle,
  description: homeSeoDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: productName,
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: [{ url: "/icon.png?v=2", width: 512, height: 512, alt: "PseudoEditor app icon" }],
  },
  twitter: {
    card: "summary",
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: ["/icon.png?v=2"],
  },
};
```

**Public dynamic blog App Router page** — `apps/web/src/app/(public)/blog/\[slug\]/page.tsx:40-48`

Public dynamic App Router page rendering is reachable without authentication.

```tsx
export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const structuredData = [
```

**Public dynamic docs App Router page** — `apps/web/src/app/(public)/docs/\[slug\]/page.tsx:39-47`

Public dynamic App Router page rendering is reachable without authentication.

```tsx
export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDoc(slug);

  if (!doc) {
    notFound();
  }

  const structuredData = [
```

**Next proxy surface exists** — `apps/web/src/proxy.ts:13-25`

The app defines a Next proxy/matcher using Clerk middleware when Clerk config is present, which is relevant to proxy-bypass advisory classes.

```typescript
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkProxy) {
    return NextResponse.next();
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
```

#### Reachability

Public home, blog, and docs routes are App Router pages reachable without authentication. The site also defines a Next proxy matcher.

- **Attacker:** unauthenticated internet client

- **Entry point:** public App Router page or proxy-matched request

- **Outcome:** availability loss or route-control bypass in affected framework code

Preconditions:
- The deployed site runs the pinned vulnerable version.
- The relevant advisory preconditions match deployment runtime configuration.

#### Severity

**High** — The affected package is internet-facing framework code used by public App Router pages, and local audit reports multiple high-severity advisories for the exact version. Confidence is medium because exploitability was not reproduced against the live deployment.

Severity would drop if the deployed runtime is already patched or the advisory preconditions are shown not to apply; it would rise with a working public DoS PoC against production.

#### Remediation

Upgrade `next` and `eslint-config-next` to a version outside all reported ranges, at minimum `>=16.2.6` for the listed proxy advisories and the latest compatible 16.x patch. Re-run `pnpm install --lockfile-only`, `pnpm audit --prod`, build, and smoke-test public pages and Clerk flows. Keep route-local authorization checks even after upgrading.

Tests:
- Run `pnpm audit --prod` and fail CI on high production advisories.
- Add a deployment smoke test that exercises public App Router pages and `/api/workspace` auth after the Next upgrade.

Preventive controls:
- Configure Dependabot/Renovate for Next/React security releases.
- Keep sensitive API authorization inside route handlers, not only middleware/proxy.

<a id="finding-3"></a>

### [3] Custom deploy helper uploads ignored Clerk keyless credentials

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Direct source and redacted local artifact evidence show an ignored Clerk keyless file with a `secretKey` field can be included by the deploy tarball; the remaining precondition is operator use of the helper. |
| Category | Secret exposure in deployment packaging |
| CWE | CWE-200, CWE-522 |
| Affected lines | apps/web/.clerk/.tmp/keyless.json:1, .gitignore:1-3, apps/web/scripts/deploy.sh:201-206, apps/web/scripts/deploy.sh:225-239 |

#### Summary

The custom `apps/web/scripts/deploy.sh` helper packages files from the working tree with a hand-written exclude list instead of honoring gitignore or allowlisting tracked build inputs. Because `apps/web/.clerk/.tmp/keyless.json` exists locally and includes a redacted `secretKey` field, running the helper can upload Clerk key material to the external deploy endpoint.

#### Root Cause

The violated invariant is that ignored local credential directories must never enter deployment archives. The repository records `.clerk/` as ignored, but the helper bypasses git packaging semantics and omits `.clerk/` from its explicit tar excludes.

**Clerk directory is ignored by git** — `.gitignore:1-3`

` .clerk/` is treated as ignored local material, but the deploy helper does not consume `.gitignore`.

```gitignore
.vercel
.clerk/
.next
```

**Deploy staging uses a static exclude list** — `apps/web/scripts/deploy.sh:201-206`

The tar staging command excludes only `node_modules`, `.git`, `.env`, and `.env.*`; `.clerk/` is not excluded.

```bash
    tar -C "$PROJECT_PATH" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.env' \
        --exclude='.env.*' \
        -cf - . | tar -C "$STAGING_DIR" -xf -
```

**Staged tree is uploaded externally** — `apps/web/scripts/deploy.sh:225-239`

The staged directory is archived and posted to the claimable deployment endpoint.

```bash
    # Create tarball of the project (excluding node_modules and .git)
    echo "Creating deployment package..." >&2
    tar -czf "$TARBALL" -C "$STAGING_DIR" .
else
    echo "Error: Input must be a directory or a .tgz file" >&2
    exit 1
fi

if [ "$FRAMEWORK" != "null" ]; then
    echo "Detected framework: $FRAMEWORK" >&2
fi

# Deploy
echo "Deploying..." >&2
RESPONSE=$(curl -s -X POST "$DEPLOY_ENDPOINT" -F "file=@$TARBALL" -F "framework=$FRAMEWORK")
```

#### Validation

The local artifact was parsed only for field names, confirming `secretKey` is present without copying its value. The tar source and upload sink are directly visible in the deploy script.

Validation method: static source trace plus redacted artifact structure

**Clerk directory is ignored by git** — `.gitignore:1-3`

` .clerk/` is treated as ignored local material, but the deploy helper does not consume `.gitignore`.

```gitignore
.vercel
.clerk/
.next
```

**Deploy staging uses a static exclude list** — `apps/web/scripts/deploy.sh:201-206`

The tar staging command excludes only `node_modules`, `.git`, `.env`, and `.env.*`; `.clerk/` is not excluded.

```bash
    tar -C "$PROJECT_PATH" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.env' \
        --exclude='.env.*' \
        -cf - . | tar -C "$STAGING_DIR" -xf -
```

**Staged tree is uploaded externally** — `apps/web/scripts/deploy.sh:225-239`

The staged directory is archived and posted to the claimable deployment endpoint.

```bash
    # Create tarball of the project (excluding node_modules and .git)
    echo "Creating deployment package..." >&2
    tar -czf "$TARBALL" -C "$STAGING_DIR" .
else
    echo "Error: Input must be a directory or a .tgz file" >&2
    exit 1
fi

if [ "$FRAMEWORK" != "null" ]; then
    echo "Detected framework: $FRAMEWORK" >&2
fi

# Deploy
echo "Deploying..." >&2
RESPONSE=$(curl -s -X POST "$DEPLOY_ENDPOINT" -F "file=@$TARBALL" -F "framework=$FRAMEWORK")
```

Evidence:
- Redacted artifact fields: apiKeysUrl, claimUrl, publishableKey, secretKey
- Validation artifact: `artifacts/05_findings/DSS-CAND-001/validation_artifacts/keyless-artifact-structure.txt`.

Counterevidence and remaining uncertainty:
- This is a deployment workflow exposure, not a directly attacker-triggerable public route.

#### Dataflow

ignored Clerk keyless file -\> filesystem tar staging -\> gzipped deployment package -\> external deploy endpoint

- **Source:** local `apps/web/.clerk/.tmp/keyless.json`

- **Sink:** multipart upload to the deploy endpoint

- **Outcome:** Clerk secret material leaves the local project tree in a deployment archive

**Deploy staging uses a static exclude list** — `apps/web/scripts/deploy.sh:201-206`

The tar staging command excludes only `node_modules`, `.git`, `.env`, and `.env.*`; `.clerk/` is not excluded.

```bash
    tar -C "$PROJECT_PATH" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.env' \
        --exclude='.env.*' \
        -cf - . | tar -C "$STAGING_DIR" -xf -
```

**Staged tree is uploaded externally** — `apps/web/scripts/deploy.sh:225-239`

The staged directory is archived and posted to the claimable deployment endpoint.

```bash
    # Create tarball of the project (excluding node_modules and .git)
    echo "Creating deployment package..." >&2
    tar -czf "$TARBALL" -C "$STAGING_DIR" .
else
    echo "Error: Input must be a directory or a .tgz file" >&2
    exit 1
fi

if [ "$FRAMEWORK" != "null" ]; then
    echo "Detected framework: $FRAMEWORK" >&2
fi

# Deploy
echo "Deploying..." >&2
RESPONSE=$(curl -s -X POST "$DEPLOY_ENDPOINT" -F "file=@$TARBALL" -F "framework=$FRAMEWORK")
```

#### Reachability

The trigger is realistic in development or preview deployment workflows but requires operator execution of the helper.

- **Attacker:** operator mistake or actor with access to uploaded deployment artifact

- **Entry point:** `apps/web/scripts/deploy.sh`

- **Outcome:** Clerk key material disclosure requiring rotation

Preconditions:
- The local keyless artifact exists.
- The helper is used without an explicit `.clerk` exclusion.

#### Severity

**Medium** — Credential disclosure can compromise Clerk control-plane material, but exploitation depends on the deployment helper being run with the local ignored artifact present rather than a direct internet request.

Severity would rise if this helper is used by production CI or if uploaded archives are retained/readable; it would drop after moving to an allowlisted package builder and rotating exposed keys.

#### Remediation

Exclude `.clerk/`, `.vercel/`, `.next/`, and other ignored credential/build directories from the deploy helper, or build the package from `git ls-files` plus explicit generated assets. Add a preflight denylist that fails if credential-looking files are staged, and rotate the Clerk key if the helper has already uploaded this tree.

Tests:
- Run the deploy packager in a disposable directory and assert `.clerk/` is absent from the tarball.
- Add a regression test or shellcheck-style test for the deploy exclude/allowlist.

Preventive controls:
- Prefer tracked-file allowlists for deployment archives.
- Add repository secret-scanning hooks for `.clerk`, Clerk secret keys, and generated credential files.

<a id="finding-4"></a>

### [4] Workspace sync persists arbitrary unbounded JSON for authenticated users

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | medium |
| Confidence rationale | The source trace proves the missing app-level schema and quota controls, but live Convex platform limits and cross-user blast radius were not measured. |
| Category | Resource exhaustion / unbounded persistence |
| CWE | CWE-400, CWE-770 |
| Affected lines | apps/web/src/app/api/workspace/route.ts:65-80, convex/workspaces.ts:29-40, convex/workspaces.ts:68-79, convex/schema.ts:12-16, apps/web/src/lib/storage.ts:174-181, packages/workspace/src/index.ts:312-344 |

#### Summary

Any signed-in user can submit an arbitrary `workspace` value to `PUT /api/workspace`. The server checks only authentication and key presence, then Convex accepts and stores the value as `v.any()`, leaving payload size, depth, node count, and schema validity to platform limits or later client-side migration.

#### Root Cause

The violated invariant is that user-controlled persisted workspace state should be structurally validated and resource-bounded before storage. The implementation defers validation until later load/migration and allows arbitrary JSON through the server persistence boundary.

**Route forwards arbitrary workspace JSON** — `apps/web/src/app/api/workspace/route.ts:65-80`

The route authenticates, parses JSON, checks only for the `workspace` property, and forwards `body.workspace`.

```typescript
  const requestAuth = await getWorkspaceRequestAuth(request);
  if (!requestAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { workspace?: unknown };

  if (!("workspace" in body)) {
    return NextResponse.json({ error: "Missing workspace payload." }, { status: 400 });
  }

  await getConvexClient().mutation(api.workspaces.saveCurrent, {
    serverSecret: getWorkspaceSyncSecret(),
    user: buildWorkspaceSyncUser(requestAuth.userId, requestAuth.claims),
    workspace: body.workspace,
  });
```

**Convex accepts workspace as any value** — `convex/workspaces.ts:29-40`

The mutation declares `workspace: v.any()` instead of a bounded workspace schema.

```typescript
export const saveCurrent = mutationGeneric({
  args: {
    serverSecret: v.string(),
    user: v.object({
      clerkUserId: v.string(),
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
    }),
    workspace: v.any(),
  },
  handler: async (ctx, args) => {
```

**Convex stores the value directly** — `convex/workspaces.ts:68-79`

The mutation patches or inserts `args.workspace` without app-level size, depth, or shape limits.

```typescript
    if (existingWorkspace) {
      await ctx.db.patch(existingWorkspace._id, {
        workspace: args.workspace,
        updatedAt: now,
      });
      return existingWorkspace._id;
    }

    return await ctx.db.insert("workspaces", {
      clerkUserId: args.user.clerkUserId,
      workspace: args.workspace,
      updatedAt: now,
```

**Table stores workspace as any value** — `convex/schema.ts:12-16`

The table schema persists `workspace` as `v.any()`.

```typescript
  workspaces: defineTable({
    clerkUserId: v.string(),
    workspace: v.any(),
    updatedAt: v.number(),
  }).index("by_clerk_user", ["clerkUserId"]),
```

#### Validation

The route, Convex mutation, and table schema all accept the workspace value without app-level shape, size, or depth validation. Later load-side code migrates and normalizes persisted data.

Validation method: static source trace

**Route forwards arbitrary workspace JSON** — `apps/web/src/app/api/workspace/route.ts:65-80`

The route authenticates, parses JSON, checks only for the `workspace` property, and forwards `body.workspace`.

```typescript
  const requestAuth = await getWorkspaceRequestAuth(request);
  if (!requestAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { workspace?: unknown };

  if (!("workspace" in body)) {
    return NextResponse.json({ error: "Missing workspace payload." }, { status: 400 });
  }

  await getConvexClient().mutation(api.workspaces.saveCurrent, {
    serverSecret: getWorkspaceSyncSecret(),
    user: buildWorkspaceSyncUser(requestAuth.userId, requestAuth.claims),
    workspace: body.workspace,
  });
```

**Convex accepts workspace as any value** — `convex/workspaces.ts:29-40`

The mutation declares `workspace: v.any()` instead of a bounded workspace schema.

```typescript
export const saveCurrent = mutationGeneric({
  args: {
    serverSecret: v.string(),
    user: v.object({
      clerkUserId: v.string(),
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
    }),
    workspace: v.any(),
  },
  handler: async (ctx, args) => {
```

**Convex stores the value directly** — `convex/workspaces.ts:68-79`

The mutation patches or inserts `args.workspace` without app-level size, depth, or shape limits.

```typescript
    if (existingWorkspace) {
      await ctx.db.patch(existingWorkspace._id, {
        workspace: args.workspace,
        updatedAt: now,
      });
      return existingWorkspace._id;
    }

    return await ctx.db.insert("workspaces", {
      clerkUserId: args.user.clerkUserId,
      workspace: args.workspace,
      updatedAt: now,
```

**Table stores workspace as any value** — `convex/schema.ts:12-16`

The table schema persists `workspace` as `v.any()`.

```typescript
  workspaces: defineTable({
    clerkUserId: v.string(),
    workspace: v.any(),
    updatedAt: v.number(),
  }).index("by_clerk_user", ["clerkUserId"]),
```

**Saved workspace is migrated on load** — `apps/web/src/lib/storage.ts:174-181`

Cloud data is fed into `migratePersistedWorkspace` and then stored locally.

```typescript
    const data = (await response.json()) as CloudWorkspaceResponse;
    if (!data.workspace) {
      return null;
    }

    const state = migratePersistedWorkspace(data.workspace, { sampleSource });
    const database = await getDatabase();
    await database.put(STORE_NAME, state, PRIMARY_KEY);
```

**Workspace validation iterates attacker-shaped maps** — `packages/workspace/src/index.ts:312-344`

Validation/normalization walks `nodes`, panel instances, layout, and other attacker-shaped fields on load.

```typescript
  const normalizedNodes: Record<string, WorkspaceNode> = {};
  for (const [id, node] of Object.entries(nodes)) {
    if (!isWorkspaceNode(node)) {
      return null;
    }
    normalizedNodes[id] = node;
  }

  const layout = coerceLayoutNode(candidate.layout);
  if (!layout) {
    return null;
  }

  const panelInstances = coercePanelInstances(candidate.panelInstances);
  if (!panelInstances) {
    return null;
  }

  return normalizeWorkspace({
    version: WORKSPACE_VERSION,
    rootFolderId: candidate.rootFolderId,
    activeDocumentId: candidate.activeDocumentId,
    nodes: normalizedNodes,
    expandedFolderIds: Array.isArray(candidate.expandedFolderIds) ? candidate.expandedFolderIds.filter(isString) : [],
    recentDocumentIds: Array.isArray(candidate.recentDocumentIds) ? candidate.recentDocumentIds.filter(isString) : [],
    virtualFiles: coerceVirtualFiles(candidate.virtualFiles),
    panelInstances,
    layout,
    lastFocusedEditorPanelId:
      typeof candidate.lastFocusedEditorPanelId === "string" ? candidate.lastFocusedEditorPanelId : null,
    lastFocusedTerminalPanelId:
      typeof candidate.lastFocusedTerminalPanelId === "string" ? candidate.lastFocusedTerminalPanelId : null,
  });
```

Evidence:
- Validation artifact: `artifacts/05_findings/DSS-CAND-003/validation_artifacts/static-workspace-payload-trace.txt`.

Counterevidence and remaining uncertainty:
- Authentication is required, and Convex/Next may impose platform request or document limits that cap the largest payload.

#### Dataflow

authenticated request JSON -\> `body.workspace` -\> Convex `v.any()` mutation -\> `workspaces.workspace` table field -\> load migration and normalization

- **Source:** authenticated attacker-controlled `workspace` body

- **Sink:** Convex storage plus load-side migration/normalization

- **Outcome:** storage consumption, slow load/migration, or account/session/backend degradation

**Route forwards arbitrary workspace JSON** — `apps/web/src/app/api/workspace/route.ts:65-80`

The route authenticates, parses JSON, checks only for the `workspace` property, and forwards `body.workspace`.

```typescript
  const requestAuth = await getWorkspaceRequestAuth(request);
  if (!requestAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { workspace?: unknown };

  if (!("workspace" in body)) {
    return NextResponse.json({ error: "Missing workspace payload." }, { status: 400 });
  }

  await getConvexClient().mutation(api.workspaces.saveCurrent, {
    serverSecret: getWorkspaceSyncSecret(),
    user: buildWorkspaceSyncUser(requestAuth.userId, requestAuth.claims),
    workspace: body.workspace,
  });
```

**Convex stores the value directly** — `convex/workspaces.ts:68-79`

The mutation patches or inserts `args.workspace` without app-level size, depth, or shape limits.

```typescript
    if (existingWorkspace) {
      await ctx.db.patch(existingWorkspace._id, {
        workspace: args.workspace,
        updatedAt: now,
      });
      return existingWorkspace._id;
    }

    return await ctx.db.insert("workspaces", {
      clerkUserId: args.user.clerkUserId,
      workspace: args.workspace,
      updatedAt: now,
```

**Saved workspace is migrated on load** — `apps/web/src/lib/storage.ts:174-181`

Cloud data is fed into `migratePersistedWorkspace` and then stored locally.

```typescript
    const data = (await response.json()) as CloudWorkspaceResponse;
    if (!data.workspace) {
      return null;
    }

    const state = migratePersistedWorkspace(data.workspace, { sampleSource });
    const database = await getDatabase();
    await database.put(STORE_NAME, state, PRIMARY_KEY);
```

#### Reachability

The route is public to authenticated users when cloud sync is configured.

- **Attacker:** signed-in user

- **Entry point:** `PUT /api/workspace`

- **Outcome:** resource consumption and availability degradation

Preconditions:
- Cloud workspace sync is configured.
- Attacker has or creates a signed-in account.

#### Severity

**Medium** — The endpoint is authenticated and primarily affects storage/availability, but public users can force unbounded persistence work in the application code without app-level quotas.

Severity would rise if platform limits allow cheap shared-service exhaustion or free signup is unrestricted; it would drop if strict app-level quotas and schema validation are added.

#### Remediation

Define a strict server-side workspace schema with maximum serialized size, node count, field count, string length, and recursion/depth limits before calling Convex. Reject unknown legacy shapes at the API boundary or migrate them in a bounded queue. Add per-user write rate limits and storage quotas.

Tests:
- Add route tests that oversized, deeply nested, and schema-invalid workspace bodies return `413` or `400` before Convex mutation.
- Add Convex mutation tests for maximum workspace size and node count.

Preventive controls:
- Centralize workspace validation in a shared schema used by both client and server.
- Monitor per-user workspace bytes and mutation frequency.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Custom deploy helper packaging | Secret handling | Reported | Reported as custom deploy helper uploading ignored Clerk keyless credentials. Evidence: artifacts/05_findings/DSS-CAND-001/validation_report.md, artifacts/05_findings/DSS-CAND-001/attack_path_analysis_report.md |
| Vercel/Convex workspace sync secret | Secret handling / authorization | Reported | Reported as tracked source secret materialization plus Convex caller-selected user IDs. Evidence: artifacts/05_findings/DSS-CAND-002/validation_report.md, artifacts/05_findings/DSS-CAND-002/attack_path_analysis_report.md |
| Workspace API auth wrapper | Authentication | No issue found | The public route verifies Clerk session or bearer token before cloud workspace access; no direct route-level missing-auth issue survived. Evidence: artifacts/03_coverage/reviewed_surfaces.md |
| Workspace payload persistence | Resource exhaustion | Reported | Reported as arbitrary unbounded JSON persistence for authenticated users. Evidence: artifacts/05_findings/DSS-CAND-003/validation_report.md, artifacts/05_findings/DSS-CAND-003/attack_path_analysis_report.md |
| Public App Router and Next.js runtime | Dependency advisory / availability | Reported | Reported as `next@16.1.6` in high advisory ranges on public App Router surfaces. Evidence: artifacts/05_findings/DSS-CAND-004/validation_report.md, artifacts/05_findings/DSS-CAND-004/attack_path_analysis_report.md, artifacts/05_findings/DSS-CAND-004/validation_artifacts/pnpm-audit-prod.json |
| Compiler/parser/runtime packages | Untrusted code execution model | No issue found | Reviewed browser-oriented compiler/runtime paths; no server-side eval, command execution, filesystem, or SSRF sink was established. Evidence: artifacts/03_coverage/reviewed_surfaces.md |
| SEO and public content rendering | XSS/content injection | No issue found | Public structured data and content are repository constants; no attacker-controlled HTML/markdown rendering path was found. Evidence: artifacts/03_coverage/reviewed_surfaces.md |
| Transitive dependency advisories outside Next | Dependency hygiene | No issue found | Audit listed additional transitive advisories, but source tracing did not establish concrete app-level attacker-controlled sinks for `dompurify`, `js-cookie`, or `ws`. Evidence: artifacts/05_findings/DSS-CAND-004/validation_artifacts/pnpm-audit-prod.json, artifacts/03_coverage/reviewed_surfaces.md |

## Open Questions And Follow Up

- Rotate any Clerk keyless secret if `apps/web/scripts/deploy.sh` has been used while `.clerk/.tmp/keyless.json` existed.
  - Follow-up prompt: Inspect deployment logs/artifacts for uploads created by apps/web/scripts/deploy.sh and rotate the Clerk keyless secret if the archive may have included apps/web/.clerk/.tmp/keyless.json.
- Confirm the deployed Next.js runtime version after upgrading.
  - Follow-up prompt: After bumping next to a patched release, run pnpm audit --prod, pnpm --filter @pseudoeditor/web build, and a smoke test against public App Router pages and /api/workspace authentication.
