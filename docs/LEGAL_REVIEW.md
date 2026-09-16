# Legal documentation review

Date: 2026-09-12 (corrections 2026-09-15)
Scope: `/privacy`, `/terms`, `/security` (English and Simplified Chinese), `SECURITY.md`, `/.well-known/security.txt`.
Method: each statement in the documents was checked against the code (`apps/web`, `convex`, `packages/workspace`)
and against the notice requirements of the GDPR (EU/EEA), UK GDPR and PECR, US federal and state law (COPPA,
CCPA/CPRA-style state laws), China's PIPL, and New Zealand's Privacy Act 2020. This is an engineering review,
not legal advice; have a lawyer confirm before relying on it.

## What the code actually does (verified)

| Claim | Source | Result |
| --- | --- | --- |
| Compiler and runtime run in the browser; code never sent to a server | `apps/web/src/workers/*`, `apps/web/src/runtime/*` | Correct |
| Signed-out production sessions keep the workspace in memory only | `apps/web/src/lib/platform.ts` (`memory` mode when not signed in) | Correct |
| Signing in turns on cloud sync, and autosave uploads the workspace | `apps/web/src/lib/platform.ts` (`cloud` mode when signed in), `useWorkspaceSession.ts` | Correct (policy says so since 2026-09-15; it previously implied a separate opt-in) |
| Localhost and desktop builds persist to IndexedDB | `apps/web/src/lib/storage.ts` | Correct |
| Theme and layout preferences in local storage | `igcse-theme-mode`, `pseudocode-compiler-*` keys | Correct |
| Convex stores Clerk user ID, email, first/last name, workspace JSON, timestamp | `convex/schema.ts` | Correct (documented as "email and name copied to Convex") |
| Every request verifies the Clerk session in the API and again in Convex | `apps/web/src/app/api/workspace/workspaceAuth.ts`, `convex/workspaces.ts` | Correct |
| Account deletion removes Convex rows | `convex/http.ts` (Svix-verified `user.deleted` webhook) | Correct **only if** `CLERK_WEBHOOK_SECRET` is set on the Convex deployment |
| In-app workspace delete or export controls | none | Do not exist. Policy and terms now say so and point to the privacy email. |
| Separate consent for cross-border transfer at sign-up | `apps/web/src/app/[locale]/login` | No checkbox exists; the sign-in page shows a passive notice. Policy reworded on 2026-09-15 to describe the notice only. |
| Analytics only on the production website, cookieless | `apps/web/src/app/[locale]/layout.tsx` renders them only when `VERCEL_ENV === "production"` | Correct (previews also loaded them before 2026-09-15) |
| Monaco served from own origin, CSP/HSTS set | `apps/web/next.config.ts`, `apps/web/src/lib/csp.ts`, `monacoLocalLoader.ts` | Correct. The CSP still allows inline scripts, and the security page says so. |
| `security.txt` published | Was under `src/public/` (not served). Moved to `apps/web/public/.well-known/`. | Fixed |

## Gaps found and fixed in the documents

1. **No controller identity or contact channel.** GDPR Art. 13(1)(a), PIPL Art. 17, CCPA all require one. The
   only channel was public GitHub issues, which is unsuitable for privacy requests. Added the operator's identity
   (individual, New Zealand) and a `privacy@pseudo.build` mailbox, plus `security@pseudo.build` for reports.
2. **No purposes / legal bases.** Added section 5 (contract, legitimate interest, legal obligation; PIPL
   Art. 13 grounds).
3. **No international-transfer notice.** All providers are US companies. Added a recipient table, the EU/UK
   transfer mechanism (SCCs / UK addendum / DPF where certified), and the PIPL Art. 39 cross-border notice
   (recipient, purpose, method, categories, how to exercise rights, withdrawal). The notice no longer claims a
   separate consent step, because none exists (see the operator actions below).
4. **Rights lists were EU/NZ only.** Added UK (ICO), US state rights and the "we do not sell or share"
   statement, PIPL rights (including deceased users' relatives), and NZ Privacy Commissioner complaints.
5. **Children.** Old text used 13 everywhere. PIPL sets 14; EU digital-consent ages range 13 to 16; UK is 13.
   Rewritten in both the policy and the terms, with a note that no student data reaches the service without an
   account, so schools need no data agreement for classroom use.
6. **Cookies.** Named Clerk's strictly-necessary cookies and explained why no consent banner is required
   (ePrivacy Art. 5(3) / PECR reg. 6 exemption). Confirmed the site sets no other cookies.
7. **Retention** was vague ("briefly"). Now per data category, including the 24-hour Vercel visitor hash and
   provider backups.
8. **Breach notification** commitment added (GDPR/UK GDPR 72 hours, PIPL notice duties).
9. **Terms:** added the Cambridge non-affiliation and "not an exam tool" disclaimer, a liability cap, carve-outs
   for non-excludable consumer rights (NZ CGA, UK CRA, EU consumer law, PRC Consumer Rights Protection Law),
   consumer venue rights, 14-day notice for material changes, a termination section, and the age rules above.
10. **Security page:** added the email reporting channel alongside GitHub private vulnerability reporting, the
    incident-notification section, and the account-deletion data flow.
11. **2026-09-15 corrections:** deletion is described as the Clerk webhook flow with email as the route for
    deletion or a copy; the "export files" and "deletion controls in the app" claims were removed; the
    "restrictive CSP" and deploy-script secret-file claims on the security page were replaced with accurate
    descriptions.

## Actions only the operator can take

- Create and monitor the `privacy@pseudo.build` and `security@pseudo.build` mailboxes (or change the
  addresses in `apps/web/src/lib/seo-content.ts`).
- Set `CLERK_WEBHOOK_SECRET` on the Convex deployment and subscribe the webhook to `user.deleted`. Optionally
  enable "Delete account" in the Clerk dashboard so users can delete their own account. The policy does not
  promise self-service deletion, only deletion on request.
- Accept the data processing agreements of Vercel, Clerk, and Convex in their dashboards; confirm each
  deployment's region is the United States, as the policy now states, or update section 7.
- **Still open:** in Clerk, enable the sign-up legal-consent checkbox pointing at `/terms` and `/privacy`.
  PIPL Art. 39 requires a *separate* affirmative act for cross-border transfer. A dedicated checkbox at sign-up
  is the cleanest evidence of that. The policy currently describes only the sign-in page notice. Once the
  checkbox is on, section 7 can say consent is asked separately again.
- GDPR Art. 27: a non-EU controller offering services to EU residents normally needs an EU representative.
  The exemption for occasional, low-risk processing plausibly applies to a free tool storing pseudocode and an
  email address, but a lawyer should confirm.
- China: the site is hosted outside the mainland, so no ICP filing is required, but Vercel, Clerk, and Convex
  may be slow or unreachable from mainland networks. Serving Chinese users well may need a China-friendly CDN
  or a mirror, which is a product decision, not a legal one.
- The GitHub repository is public. Confirm private vulnerability reporting is enabled, as `SECURITY.md` promises.
