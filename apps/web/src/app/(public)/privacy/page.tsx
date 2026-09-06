import type { Metadata } from "next";
import { LegalPage } from "@/app/components/LegalPage";
import { githubUrl, productName } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Pseudo Build collects, why, where it is stored, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

const effectiveDate = "2026-09-06";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="privacy"
      title="We collect as little as the product allows."
      summary={`This policy explains what data ${productName} handles, where it lives, and how to remove it. The short version: nothing leaves your browser unless you sign in and turn on cloud sync.`}
      effectiveDate={effectiveDate}
      sections={[
        {
          id: "summary",
          title: "1. Summary",
          content: (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>When</th>
                  <th>Where it is stored</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Your pseudocode and workspace layout</td>
                  <td>Always, while you edit</td>
                  <td>Your browser (memory, or local storage on localhost). Convex, only if you sign in and sync.</td>
                </tr>
                <tr>
                  <td>Email address, name, avatar</td>
                  <td>Only if you create an account</td>
                  <td>Clerk (authentication). Email and name are also copied to Convex next to your workspace.</td>
                </tr>
                <tr>
                  <td>Anonymous page performance and visit counts</td>
                  <td>On the public website</td>
                  <td>Vercel Analytics and Speed Insights. No cookies, no cross-site tracking.</td>
                </tr>
                <tr>
                  <td>Server logs (IP address, user agent, request path)</td>
                  <td>Every request</td>
                  <td>Vercel, retained briefly for operations and abuse prevention.</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "no-account",
          title: "2. Using the editor without an account",
          content: (
            <>
              <p>
                The compiler and runtime run entirely in your browser using WebAssembly. Your code is never sent to a server to compile or execute.
              </p>
              <p>
                On the public site, a signed-out session keeps your workspace in memory only. On localhost or the desktop build, the workspace is saved to your browser&apos;s IndexedDB so it survives reloads. Theme and layout preferences are kept in local storage. You can clear all of this through your browser settings.
              </p>
            </>
          ),
        },
        {
          id: "account",
          title: "3. Accounts and cloud sync",
          content: (
            <>
              <p>
                When you sign in, authentication is handled by <a href="https://clerk.com" target="_blank" rel="noopener noreferrer">Clerk</a>. Clerk stores your email address, name, profile image, sign-in method, and session information. Clerk sets cookies that are strictly necessary to keep you signed in.
              </p>
              <p>
                When you save a workspace, it is sent over HTTPS to our <a href="https://convex.dev" target="_blank" rel="noopener noreferrer">Convex</a> database and stored against your Clerk user ID, together with your email address and name so the record can be identified. Workspaces are limited in size and validated before storage.
              </p>
              <p>Only you can read your workspace. Access is enforced by verifying your Clerk session token on every request, both in the API layer and inside the database functions.</p>
            </>
          ),
        },
        {
          id: "analytics",
          title: "4. Analytics",
          content: (
            <p>
              The public website uses Vercel Analytics and Vercel Speed Insights to count page views and measure load performance. These tools do not use cookies, do not fingerprint devices, and do not track you across other sites. They are not loaded in local or desktop builds. We do not run advertising or third-party marketing scripts.
            </p>
          ),
        },
        {
          id: "sharing",
          title: "5. Who we share data with",
          content: (
            <>
              <p>We do not sell personal data. Data is processed only by the providers needed to run the service:</p>
              <ul>
                <li><strong>Vercel</strong> hosts the website and API routes.</li>
                <li><strong>Clerk</strong> provides authentication and account management.</li>
                <li><strong>Convex</strong> stores synced workspaces.</li>
              </ul>
              <p>Each provider acts under its own privacy policy and security commitments. We may disclose data if required by law.</p>
            </>
          ),
        },
        {
          id: "retention",
          title: "6. Retention and deletion",
          content: (
            <>
              <p>
                Synced workspaces are kept until you delete them or delete your account. Deleting your account from the account settings inside the editor removes your Clerk profile and your stored workspace and user record in Convex.
              </p>
              <p>
                You can also open an issue on{" "}
                <a href={`${githubUrl}/issues`} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>{" "}
                or contact the maintainer to request export or deletion of your data. Requests are handled within 30 days.
              </p>
            </>
          ),
        },
        {
          id: "rights",
          title: "7. Your rights",
          content: (
            <p>
              Depending on where you live, you may have the right to access, correct, export, or delete your personal data, and to object to or restrict certain processing. New Zealand users have rights under the Privacy Act 2020, and EU and UK users have rights under the GDPR. To exercise them, use the deletion controls in the app or contact us as described above.
            </p>
          ),
        },
        {
          id: "children",
          title: "8. Children",
          content: (
            <p>
              The editor works without an account and is suitable for students of any age. We do not knowingly collect personal data from children under 13 through accounts. If you believe a child has created an account, contact us and we will remove it.
            </p>
          ),
        },
        {
          id: "changes",
          title: "9. Changes",
          content: (
            <p>
              We will update this policy if the data we handle changes. The effective date above reflects the current version, and past versions are available in the repository history.
            </p>
          ),
        },
      ]}
    />
  );
}
