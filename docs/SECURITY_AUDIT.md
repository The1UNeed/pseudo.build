# Security audit: Pseudo Build

Date: 2026-09-06 (status updated 2026-09-15)
Scope: this repository at the rebrand commit (web app, Convex backend, compiler, WASM runtime, deploy and migration scripts).
Method: manual source review by Claude Fable 5.1 with an independent read-only review by Claude Opus 5, plus `pnpm audit --prod`. No live production systems were exercised.

## Summary

The attack surface is small: the compiler and runtime execute in the browser, and the only server path is
`/api/workspace` → Convex, guarded by Clerk session verification at both layers. The review found no way for
one user to read or write another user's workspace. The issues found were hardening gaps, all of which were
fixed in the same change set except where noted under residual risks.

## Status update (2026-09-15)

Corrections and changes since the original review, following the 2026-09-13 codebase audit:

- The GitHub repository is public (GPL-3.0).
- The migration scripts under `scripts/migration/` have been deleted. Finding 10 and Opus finding 7 below
  describe code that no longer exists.
- The earlier claim that deploy scripts refuse to package secret files was not accurate: only one legacy
  file was checked. Secrets stay out of the repository because `.env*` files are gitignored and values live
  in Vercel and Convex environment variables.
- The CSP is built in `apps/web/src/lib/csp.ts` and covered by `csp.test.ts`. Convex origins were removed
  from `connect-src` because the browser only talks to `/api/workspace`. The `https://*.clerk.accounts.dev`
  and `https://*.clerk.com` wildcards were removed from production. `*.clerk.accounts.dev` and
  `clerk-telemetry.com` are allowed only in development or with a `pk_test_` key.
- Production CSP:

  ```text
  default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self';
  script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://clerk.pseudo.build https://challenges.cloudflare.com https://va.vercel-scripts.com https://vitals.vercel-insights.com;
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://img.clerk.com; font-src 'self' data:; worker-src 'self' blob:;
  connect-src 'self' https://clerk.pseudo.build https://challenges.cloudflare.com https://img.clerk.com https://va.vercel-scripts.com https://vitals.vercel-insights.com;
  frame-src https://clerk.pseudo.build https://challenges.cloudflare.com; upgrade-insecure-requests
  ```

Open items:

- `script-src` still allows `'unsafe-inline'`. Moving to per-request nonces (set in `apps/web/src/proxy.ts`)
  would force every page to render dynamically, so it was deferred. Until then the CSP does not protect
  against an injected inline script.
- No rate limit or write quota on workspace sync (`convex/workspaces.ts` `saveCurrent`).
- No Convex tests for authorization, the webhook signature check, or `deleteByClerkUserId`.
- `verifyToken` runs without `authorizedParties` (Opus finding 8).
- An open tab with a still-valid token can autosave after the `user.deleted` webhook and recreate rows.

## Findings and fixes

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| 1 | Medium | Monaco editor was loaded at runtime from the jsDelivr CDN (default `@monaco-editor/react` loader). A CDN compromise would run arbitrary script in the editor origin. | Fixed: `apps/web/src/lib/monacoLocalLoader.ts` serves Monaco and its worker from the app bundle. |
| 2 | Medium | No Content-Security-Policy, HSTS, or other hardening headers were set. | Fixed: `apps/web/next.config.ts` sets CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and disables `X-Powered-By`. |
| 3 | Medium | 19 known advisories in production dependencies (Next.js, postcss, nanoid, sharp, browserslist, dompurify). | Fixed: Next upgraded to 16.3.4 and pnpm overrides pin patched transitive versions. `pnpm audit --prod` now reports no known vulnerabilities. |
| 4 | Low | Deleting a Clerk account left the user's workspace and profile row in Convex. | Fixed: `convex/http.ts` verifies Clerk `user.deleted` webhooks with Svix signatures and `convex/users.ts` deletes the user's rows. |
| 5 | Low | `workspaces.saveCurrent` stored caller-supplied `email`, `firstName`, and `lastName` without checking them against the token. A user could only affect their own row, but the values were not trustworthy. | Fixed: the mutation now prefers identity claims from the verified token and falls back to the arguments only when the claim is absent. |
| 6 | Info | Old brand assets and a stale security report from the previous owner were checked in. | Removed as part of the rebrand. |
| 7 | High | Compiler pretty-printed the AST on every compile, so a 24 KB expression chain produced a 500 MB string and could OOM the tab (Opus review, finding 1). | Fixed: compact `JSON.stringify` in `packages/compiler/src/index.ts`. |
| 8 | High | Parser and analyzer recursed without limits; a 10 KB input caused an uncaught `RangeError`, including on the main thread in the flowchart view (Opus review, finding 2). | Fixed: nesting limit of 200 in the parser (`SYN099`), `RangeError` guard around semantic analysis (`SEM099`), and try/catch in `FlowchartEditor.tsx`. |
| 9 | Medium | No source size cap and no compile-worker timeout (Opus review, findings 4 and 5). | Fixed: 256 KB cap (`CMP413`) and a 10 s timeout that terminates the worker in `compilePseudocodeInWorker.ts`. |
| 10 | Low | Migration zip step passed export entry names as raw arguments; authenticated GET lacked `Cache-Control`; CSP emitted `upgrade-insecure-requests` in dev (Opus review, findings 7 and 9). | Fixed. The migration scripts have since been deleted. |

## Positive controls observed

- `apps/web/src/app/api/workspace/workspaceAuth.ts` accepts a request only when Clerk's `auth()` resolves a
  session or a bearer token verifies with `verifyToken` against the server secret.
- `convex/workspaces.ts` calls `ctx.auth.getUserIdentity()` in every query and mutation and looks up rows by the
  token subject, never by a client-supplied ID.
- Workspace payloads are validated twice (`packages/workspace/src/index.ts` and `convex/workspaces.ts`) with hard
  limits on bytes, depth, entries, node count, and schema shape.
- The Rust runtime enforces an instruction budget, and `apps/web/src/runtime/executeRuntime.ts` races execution
  against a timeout and terminates the worker.
- `.env*` files are gitignored and no environment file is tracked.
- All `dangerouslySetInnerHTML` uses render `JSON.stringify` of static structured data or a static theme script.

## Residual risks

- The CSP allows `'unsafe-inline'` for scripts because Next.js emits inline hydration scripts and the theme boot
  script. Moving to nonces requires proxy-generated nonces and dynamic rendering; see the open items above.
- `CLERK_WEBHOOK_SECRET` must be set on the Convex deployment or the webhook returns 503 and account deletion
  will not clean up data.
- The repository is public. Confirm GitHub private vulnerability reporting is enabled under Settings → Code
  security, because `SECURITY.md` and the security page offer it as a reporting channel.

## Independent review (Claude Opus 5, read-only)

The review below was produced before findings 7 to 10 were fixed. Its findings 1, 2, 4, 5, 7, and 9 are
addressed above. Finding 3 (`'unsafe-inline'`), finding 6 (runtime call depth and output caps), finding 8
(`authorizedParties`), and finding 10 (Convex-side `virtualFiles` shape check) remain open as follow-ups.

### Summary

The workspace sync path is soundly designed: the user identity is never taken from the request body, Convex derives `clerkUserId` from the verified JWT subject on every read and write, and both the Next.js route and the Convex mutation independently validate and size-limit the payload. No cross-user read or write path and no XSS were found. The real issues are availability and robustness in the compiler and its callers, most notably a 400x memory blowup from a pretty-printed AST, plus an over-permissive `script-src 'unsafe-inline'` in the CSP.

### Findings

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | High | `packages/compiler/src/index.ts` | `JSON.stringify(ast, null, 2)` is O(nodes x depth); 24 KB source produced a 503 MB string and 1.6 GB RSS |
| 2 | High | `apps/web/src/app/components/flowchart/model.ts`, `FlowchartEditor.tsx` | Unbounded parser recursion plus unguarded main-thread `parseSource` led to an uncaught `RangeError` in a `useEffect` |
| 3 | Medium | `apps/web/next.config.ts` | `script-src 'unsafe-inline'` defeats the XSS value of the CSP |
| 4 | Medium | `apps/web/src/runtime/compilePseudocodeInWorker.ts` | Compile worker had no timeout and was never terminated on a hung compile |
| 5 | Medium | `packages/compiler/src/types.ts` | No source size cap before compiling |
| 6 | Low | `packages/pseudocode-runtime/src/lib.rs` | `call_user_routine` has no call-depth limit; no stdout size cap; `instruction_budget` is caller-supplied and unclamped (not currently reachable) |
| 7 | Low | migration zip step (script since deleted) | `zip` argument injection via a leading-dash entry name from an untrusted export |
| 8 | Info | `apps/web/src/app/api/workspace/workspaceAuth.ts` | `verifyToken` called without `authorizedParties`; no impact because Convex re-verifies the token |
| 9 | Info | `apps/web/src/app/api/workspace/route.ts` | No `Cache-Control: private, no-store` on an authenticated response |
| 10 | Info | `convex/workspaces.ts` | Convex-side validator does not check `virtualFiles` shape (the web-side validator does) |

### Positive controls observed

- No cross-user access: every Convex query and mutation takes `clerkUserId` from `identity.subject` and reads through the `by_clerk_user` index. No argument anywhere names a user or workspace ID.
- Payload limits are enforced independently in the route and in Convex, with an explicit-stack inspector that cannot itself be stack-overflowed.
- Electron auth stubs are aliased only in the Vitest config and cannot reach a web build. Build-target guards fail closed with 503.
- All seven `dangerouslySetInnerHTML` uses render static data. Terminal output and flowchart labels are React text children. No `innerHTML`, `eval`, `new Function`, or `document.write` in the source tree.
- Webhook verification runs on the raw body before parsing, returns 400 on failure, and 503 when the secret is missing. Svix enforces timestamp tolerance against replay.
- The WASM runtime imports only `wasm_bindgen::prelude`, exports a single `run_pseudocode(&str) -> String`, and has no host function for network or DOM access. Virtual files are a `HashMap` in linear memory.
- Runtime execution races a 12 s timeout, terminates the worker, and the Rust side enforces a 1M instruction budget.
- No env file is tracked.
- No open redirects: callback and logout targets are hardcoded.
- The CSP was checked consumer by consumer (WASM, Monaco workers, Clerk including Turnstile, Vercel Analytics and Speed Insights) and is complete for production.
- Tokenizer regexes cannot backtrack, and every tokenizer and parser loop is guaranteed to consume input.

### Residual risks

- `'unsafe-inline'` means the CSP is not a second line of defense against a future XSS. Nonce-based CSP via middleware is the follow-up.
- Every denial-of-service found is scoped to the victim's own tab. If workspace sharing is ever added, compiler robustness becomes remotely triggerable.
- Not covered: Clerk, Convex, and Vercel dashboard configuration, and rate limiting on `/api/workspace` beyond Convex's own limits.
