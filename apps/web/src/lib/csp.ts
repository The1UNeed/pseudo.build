/**
 * Content-Security-Policy for every response. Kept free of `@/` imports because next.config.ts loads it.
 *
 * Clerk (https://clerk.com/docs/security/clerk-csp): clerk-js and its UI load from the Frontend API host,
 * sign-up may show a Cloudflare Turnstile challenge, and avatars come from img.clerk.com.
 * Development keys (pk_test_...) use a random *.clerk.accounts.dev host and send telemetry, so those
 * hosts are allowed only in development or when the key is a test key.
 *
 * Scripts still allow 'unsafe-inline': nonces would force every page to render dynamically.
 * The browser never calls Convex directly (only /api/workspace does), so Convex is not listed.
 */
export function buildContentSecurityPolicy({
  isDev,
  clerkPublishableKey = "",
}: {
  isDev: boolean;
  clerkPublishableKey?: string;
}): string {
  const clerkTestHosts = isDev || clerkPublishableKey.startsWith("pk_test_");
  const clerkOrigins = [
    "https://clerk.pseudo.build",
    "https://challenges.cloudflare.com",
    ...(clerkTestHosts ? ["https://*.clerk.accounts.dev"] : []),
  ];
  const clerkConnectOrigins = [
    ...clerkOrigins,
    "https://img.clerk.com",
    ...(clerkTestHosts ? ["https://clerk-telemetry.com"] : []),
  ];
  const vercelOrigins = ["https://va.vercel-scripts.com", "https://vitals.vercel-insights.com"];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} ${[...clerkOrigins, ...vercelOrigins].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.clerk.com",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src 'self' ${[...clerkConnectOrigins, ...vercelOrigins].join(" ")}${isDev ? " ws: http://localhost:*" : ""}`,
    `frame-src ${clerkOrigins.join(" ")}`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
