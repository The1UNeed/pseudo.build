import type { LegalContent } from "@/app/components/LegalPage";
import { githubUrl, productName, securityEmail } from "@/lib/seo-content";

export const securityEn: LegalContent = {
  eyebrow: "security",
  title: "Small surface, defended on purpose.",
  summary: `${productName} runs almost everything in your browser. This page explains the parts that do touch a server, how they are protected, and how to tell us if you find a problem.`,
  sections: [
    {
      id: "architecture",
      title: "1. Architecture",
      content: (
        <>
          <p>
            The compiler and runtime are compiled to WebAssembly and execute inside your browser tab. Programs run in
            a Web Worker with no network or file-system access, an instruction budget, and a timeout. No pseudocode is
            ever sent to a server to run.
          </p>
          <p>The only server-side components are:</p>
          <ul>
            <li>Static pages and the editor bundle, served by Vercel.</li>
            <li>A workspace sync API that forwards requests to Convex after verifying your session.</li>
            <li>Convex database functions that store and return one workspace per user.</li>
          </ul>
          <p>All of these run on servers in the United States.</p>
        </>
      ),
    },
    {
      id: "auth",
      title: "2. Authentication and access control",
      content: (
        <>
          <p>
            Sign-in is delegated to Clerk. Sessions are short-lived JSON Web Tokens. The sync API accepts a request
            only if Clerk verifies the session, and it forwards your token to Convex, where every query and mutation
            checks the identity again before reading or writing.
          </p>
          <p>
            Workspaces are indexed by the verified user ID from the token, never by a value the client supplies.
            There is no admin bypass, shared secret, or service role in the request path.
          </p>
        </>
      ),
    },
    {
      id: "data",
      title: "3. Data protection",
      content: (
        <ul>
          <li>
            All traffic uses HTTPS. HSTS, a Content Security Policy, and standard hardening headers are set on every
            response. The policy limits scripts, connections, and frames to our own origin and the providers we use,
            but it still allows inline scripts.
          </li>
          <li>
            Workspace payloads are validated twice, in the API route and in Convex, with hard limits on size, depth,
            node count, and shape.
          </li>
          <li>
            The editor loads Monaco and its workers from our own origin, not a third-party CDN.
          </li>
          <li>
            Secrets live only in environment variables on Vercel and Convex. The repository contains no credentials,
            and environment files are excluded from version control.
          </li>
          <li>Dependencies are pinned in a lockfile and reviewed against known advisories before releases.</li>
          <li>
            When your account is deleted, Clerk sends a signed webhook and Convex deletes your workspace and user
            record.
          </li>
        </ul>
      ),
    },
    {
      id: "incidents",
      title: "4. If something goes wrong",
      content: (
        <p>
          If we learn of a breach that affects your personal data, we will notify affected account holders by email
          without undue delay and inform the supervisory authorities where the law requires it, including within the
          72-hour window set by the GDPR and UK GDPR and the notification duties under China&apos;s PIPL.
        </p>
      ),
    },
    {
      id: "reporting",
      title: "5. Reporting a vulnerability",
      content: (
        <>
          <p>
            If you believe you have found a security issue, please email{" "}
            <a href={`mailto:${securityEmail}`}>{securityEmail}</a> or use{" "}
            <a href={`${githubUrl}/security/advisories/new`} target="_blank" rel="noopener noreferrer">
              GitHub private vulnerability reporting
            </a>
            . Do not open a public issue for security problems. A machine-readable version of this policy is at{" "}
            <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
          </p>
          <p>
            Include the steps to reproduce, the impact you believe it has, and any proof of concept. You will get an
            acknowledgement within 7 days and a status update within 30 days.
          </p>
        </>
      ),
    },
    {
      id: "safe-harbor",
      title: "6. Safe harbor for researchers",
      content: (
        <>
          <p>
            We support good-faith security research. If you follow these rules we will not pursue legal action and
            will work with you to fix the issue:
          </p>
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
      title: "7. Running your own copy",
      content: (
        <p>
          Because the code is open source you can run {productName} yourself. The README in the repository explains
          which environment variables are required and how to configure Clerk and Convex for a private deployment.
          Self-hosted instances are outside the scope of this policy.
        </p>
      ),
    },
  ],
};
