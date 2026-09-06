import type { Metadata } from "next";
import { LegalPage } from "@/app/components/LegalPage";
import { githubUrl, productName } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Security",
  description: "How Pseudo Build protects your data and how to report a vulnerability.",
  alternates: { canonical: "/security" },
};

const effectiveDate = "2026-09-06";

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="security"
      title="Small surface, defended on purpose."
      summary={`${productName} runs almost everything in your browser. This page explains the parts that do touch a server, how they are protected, and how to tell us if you find a problem.`}
      effectiveDate={effectiveDate}
      sections={[
        {
          id: "architecture",
          title: "1. Architecture",
          content: (
            <>
              <p>
                The compiler and runtime are compiled to WebAssembly and execute inside your browser tab. Programs run in a Web Worker with no network or file-system access. No pseudocode is ever sent to a server to run.
              </p>
              <p>The only server-side components are:</p>
              <ul>
                <li>Static pages and the editor bundle, served by Vercel.</li>
                <li>A workspace sync API that forwards requests to Convex after verifying your session.</li>
                <li>Convex database functions that store and return one workspace per user.</li>
              </ul>
            </>
          ),
        },
        {
          id: "auth",
          title: "2. Authentication and access control",
          content: (
            <>
              <p>
                Sign-in is delegated to Clerk. Sessions are short-lived JSON Web Tokens. The sync API accepts a request only if Clerk verifies the session, and it forwards your token to Convex, where every query and mutation checks the identity again before reading or writing.
              </p>
              <p>
                Workspaces are indexed by the verified user ID from the token, never by a value the client supplies. There is no admin bypass, shared secret, or service role in the request path.
              </p>
            </>
          ),
        },
        {
          id: "data",
          title: "3. Data protection",
          content: (
            <ul>
              <li>All traffic uses HTTPS. HSTS, a restrictive Content Security Policy, and standard hardening headers are set on every response.</li>
              <li>Workspace payloads are validated twice, in the API route and in Convex, with hard limits on size, depth, node count, and shape.</li>
              <li>Secrets live only in environment variables on Vercel and Convex. The repository contains no credentials and the deploy scripts refuse to run if secret files are present.</li>
              <li>Dependencies are pinned in a lockfile and reviewed against known advisories before releases.</li>
            </ul>
          ),
        },
        {
          id: "reporting",
          title: "4. Reporting a vulnerability",
          content: (
            <>
              <p>
                If you believe you have found a security issue, please report it privately through{" "}
                <a href={`${githubUrl}/security/advisories/new`} target="_blank" rel="noopener noreferrer">
                  GitHub private vulnerability reporting
                </a>
                . Do not open a public issue for security problems.
              </p>
              <p>Include the steps to reproduce, the impact you believe it has, and any proof of concept. You will get an acknowledgement within 7 days and a status update within 30 days.</p>
            </>
          ),
        },
        {
          id: "safe-harbor",
          title: "5. Safe harbor for researchers",
          content: (
            <>
              <p>We support good-faith security research. If you follow these rules we will not pursue legal action and will work with you to fix the issue:</p>
              <ul>
                <li>Test only against accounts you own or have permission to use.</li>
                <li>Do not access, modify, or delete other users&apos; data.</li>
                <li>Do not run denial-of-service, spam, or social-engineering attacks.</li>
                <li>Give us reasonable time to fix the issue before disclosing it publicly.</li>
              </ul>
            </>
          ),
        },
        {
          id: "self-host",
          title: "6. Running your own copy",
          content: (
            <p>
              Because the code is open source you can run {productName} yourself. The README in the repository explains which environment variables are required and how to configure Clerk and Convex for a private deployment. Self-hosted instances are outside the scope of this policy.
            </p>
          ),
        },
      ]}
    />
  );
}
