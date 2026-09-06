# Security policy

Pseudo Build runs its compiler and runtime entirely in the browser. The only server-side
surface is the workspace sync API (Next.js route → Convex) guarded by Clerk sessions.

## Reporting a vulnerability

Please report security issues privately through
[GitHub private vulnerability reporting](https://github.com/The1UNeed/pseudo.build/security/advisories/new).
Do not open a public issue.

Include reproduction steps, the impact you believe it has, and a proof of concept if you have one.
You will receive an acknowledgement within 7 days and a status update within 30 days.

## Scope

In scope: this repository, https://pseudo.build, and the workspace sync API.
Out of scope: third-party providers (Clerk, Convex, Vercel), denial-of-service, social engineering,
and self-hosted forks.

## Safe harbor

Good-faith research that stays within accounts you own, does not access other users' data,
and gives us reasonable time to fix an issue will not be met with legal action.

The full policy is published at https://pseudo.build/security.
