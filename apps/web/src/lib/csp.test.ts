import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";

function directive(policy: string, name: string) {
  return policy.split("; ").find((entry) => entry.startsWith(`${name} `)) ?? "";
}

describe("content security policy", () => {
  it("pins production to the pseudo.build Clerk host and never lists Convex", () => {
    const policy = buildContentSecurityPolicy({ isDev: false, clerkPublishableKey: "pk_live_example" });

    for (const name of ["script-src", "connect-src", "frame-src"]) {
      expect(directive(policy, name)).toContain("https://clerk.pseudo.build");
      expect(directive(policy, name)).toContain("https://challenges.cloudflare.com");
    }
    expect(policy).not.toContain("clerk.accounts.dev");
    expect(policy).not.toContain("*.clerk.com");
    expect(policy).not.toContain("convex");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("localhost");
    expect(directive(policy, "img-src")).toContain("https://img.clerk.com");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("allows Clerk development hosts for a test key", () => {
    const policy = buildContentSecurityPolicy({ isDev: false, clerkPublishableKey: "pk_test_example" });
    expect(directive(policy, "script-src")).toContain("https://*.clerk.accounts.dev");
    expect(directive(policy, "connect-src")).toContain("https://clerk-telemetry.com");
  });

  it("adds dev-only sources in development", () => {
    const policy = buildContentSecurityPolicy({ isDev: true });
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "connect-src")).toContain("https://*.clerk.accounts.dev");
    expect(directive(policy, "connect-src")).toContain("http://localhost:*");
    expect(policy).not.toContain("convex");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
