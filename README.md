<p align="center">
  <img src="apps/web/public/branding/app-icon.svg" width="80" alt="Pseudo Build" />
</p>

<h1 align="center">Pseudo Build</h1>

<p align="center"><strong>Free and open-source pseudo code editor and compiler.</strong><br />
Build your pseudo code project freely and creatively.</p>

<p align="center">
  <a href="https://pseudo.build">pseudo.build</a> ·
  <a href="https://pseudo.build/docs">Docs</a> ·
  <a href="https://pseudo.build/manual">Manual</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="LICENSE">GPL-3.0</a>
</p>

Pseudo Build lets you write structured pseudocode, compile it with line-level diagnostics,
run it in your browser, and view it as a flowchart. Everything runs client-side in
WebAssembly. Signing in is optional and only enables cloud workspace sync.

## Repository layout

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js website and browser editor (`@pseudobuild/web`) |
| `packages/compiler` | TypeScript tokenizer, parser, and AST compiler (`@pseudobuild/compiler`) |
| `packages/workspace` | Workspace model, validation, and persistence helpers (`@pseudobuild/workspace`) |
| `packages/pseudocode-runtime` | Rust runtime compiled to WebAssembly |
| `convex` | Convex schema, workspace sync functions, and Clerk webhook |
| `scripts` | Build scripts |

## Languages

The site and editor ship in English (`/`) and Simplified Chinese (`/zh`). Locale routing lives in
`apps/web/src/proxy.ts`, UI strings in `apps/web/src/i18n/messages/`, docs and blog content in
`apps/web/src/lib/seo-content*.ts`, and legal pages in `content.en.tsx` / `content.zh.tsx` next to each page.
Every page emits `hreflang` alternates and the sitemap lists both locales.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest + cargo tests
pnpm typecheck
pnpm lint
pnpm build
```

On localhost the editor saves to browser storage and no account is required.

### Optional: accounts and cloud sync

1. Create a Clerk application and a Convex project.
2. Copy `.env.example` to `apps/web/.env.local` and fill in the Clerk keys.
3. Run `npx convex dev` to link the Convex project (it writes `NEXT_PUBLIC_CONVEX_URL`).
4. In the Convex dashboard set `CLERK_JWT_ISSUER_DOMAIN` to your Clerk Frontend API URL and
   `CLERK_WEBHOOK_SECRET` to the signing secret of a Clerk webhook that targets
   `<your-convex-site-url>/clerk/webhook` for the `user.deleted` event.
5. In Clerk, add a JWT template named `convex`.

### Rebuilding the WebAssembly runtime

```bash
pnpm build:runtime   # requires Rust and wasm-pack
```

## Deployment

The site deploys to Vercel with `vercel.json`, which runs `scripts/vercel-build.sh` to deploy
Convex functions and build the web app in one step. Required Vercel environment variables:
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CONVEX_DEPLOY_KEY`.

## Contributing

Issues and pull requests are welcome at https://github.com/The1UNeed/pseudo.build.
Please report security problems privately as described in [SECURITY.md](SECURITY.md).

## License

Copyright (C) 2026 Alex Xin Liu. Licensed under the GNU General Public License v3. See [LICENSE](LICENSE).
