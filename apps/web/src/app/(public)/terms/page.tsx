import type { Metadata } from "next";
import { LegalPage } from "@/app/components/LegalPage";
import { githubUrl, productName } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "User agreement",
  description: "The terms that apply when you use the Pseudo Build website, editor, and cloud workspace sync.",
  alternates: { canonical: "/terms" },
};

const effectiveDate = "2026-09-06";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="user agreement"
      title="Simple terms for a free tool."
      summary={`These terms apply to the ${productName} website, the browser editor, and the optional account features. Using the service means you agree to them.`}
      effectiveDate={effectiveDate}
      sections={[
        {
          id: "service",
          title: "1. What the service is",
          content: (
            <>
              <p>
                {productName} is a free and open-source pseudo code editor and compiler. It lets you write pseudocode, compile it, run it in your browser, view it as a flowchart, and optionally save multi-file workspaces to your account.
              </p>
              <p>
                The service is operated by an individual developer, not a company. It is provided as a free public tool and is not a commercial product.
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "2. Accounts",
          content: (
            <>
              <p>
                You do not need an account to use the editor. An account is only required for cloud workspace sync. Accounts are managed through Clerk, our authentication provider.
              </p>
              <ul>
                <li>You must give accurate sign-up information and keep your login credentials secure.</li>
                <li>You are responsible for activity that happens under your account.</li>
                <li>You can delete your account at any time from the account settings inside the editor. Deleting your account removes your synced workspace.</li>
                <li>If you are under 13, or under the age of digital consent where you live, use the service without an account or with a parent or guardian.</li>
              </ul>
            </>
          ),
        },
        {
          id: "your-content",
          title: "3. Your content",
          content: (
            <>
              <p>
                The pseudocode, files, and workspace layouts you create belong to you. We claim no ownership over them.
              </p>
              <p>
                When you use cloud sync, you grant us permission to store and transmit your content only as needed to provide the sync feature back to you. We do not read, sell, or use your workspaces for any other purpose.
              </p>
              <p>You agree not to store content that is illegal, that infringes someone else&apos;s rights, or that contains malware.</p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "4. Acceptable use",
          content: (
            <>
              <p>Do not:</p>
              <ul>
                <li>Attempt to access other users&apos; accounts or workspaces.</li>
                <li>Probe, scan, or overload the service or its providers, except as permitted by our <a href="/security">security policy</a>.</li>
                <li>Automate requests to the sync API at volumes a person could not produce by hand.</li>
                <li>Use the service to distribute spam, malware, or abusive material.</li>
              </ul>
              <p>We may suspend or remove accounts that break these rules.</p>
            </>
          ),
        },
        {
          id: "open-source",
          title: "5. Open-source license",
          content: (
            <>
              <p>
                The {productName} source code is published under the GNU General Public License, version 3, at{" "}
                <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                  {githubUrl}
                </a>
                . The license governs your use of the code. These terms govern your use of the hosted service at pseudo.build.
              </p>
              <p>
                The {productName} name and logo identify this project. You may run your own copy of the software, but please do not present a fork as the official service.
              </p>
            </>
          ),
        },
        {
          id: "availability",
          title: "6. Availability and changes",
          content: (
            <>
              <p>
                The service is provided free of charge with no uptime guarantee. Features may change, be paused, or be removed. Where practical we will announce changes that affect stored data on the GitHub repository ahead of time.
              </p>
              <p>Keep your own copies of important work. The editor lets you export files at any time.</p>
            </>
          ),
        },
        {
          id: "disclaimer",
          title: "7. Disclaimer and liability",
          content: (
            <>
              <p>
                The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express or implied, including fitness for a particular purpose. The compiler follows an interpretation of common pseudocode conventions and is not an official examination tool.
              </p>
              <p>
                To the fullest extent permitted by law, the operator is not liable for any indirect, incidental, or consequential loss, including lost work, arising from your use of the service. Nothing in these terms limits rights you have under consumer law that cannot be excluded.
              </p>
            </>
          ),
        },
        {
          id: "law",
          title: "8. Governing law",
          content: (
            <p>
              These terms are governed by the laws of New Zealand. Any dispute will be handled in the courts of New Zealand unless the law where you live requires otherwise.
            </p>
          ),
        },
        {
          id: "changes",
          title: "9. Changes to these terms",
          content: (
            <p>
              We may update these terms. The effective date at the top of this page shows the current version, and the full history is in the repository. Continued use after a change means you accept the new terms.
            </p>
          ),
        },
        {
          id: "contact",
          title: "10. Contact",
          content: (
            <p>
              Questions about these terms can be raised as an issue on{" "}
              <a href={`${githubUrl}/issues`} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              . For account or privacy matters, see the <a href="/privacy">privacy policy</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
