import Link from "next/link";
import type { LegalContent } from "@/app/components/LegalPage";
import { localePath } from "@/i18n/config";
import { contactEmail, githubUrl, productName } from "@/lib/seo-content";

export const termsEn: LegalContent = {
  eyebrow: "user agreement",
  title: "Simple terms for a free tool.",
  summary: `These terms apply to the ${productName} website, the browser editor, and the optional account features. Using the service means you agree to them.`,
  sections: [
    {
      id: "service",
      title: "1. What the service is",
      content: (
        <>
          <p>
            {productName} is a free and open-source pseudo code editor and compiler. It lets you write pseudocode,
            compile it, run it in your browser, view it as a flowchart, and optionally save multi-file workspaces to
            your account.
          </p>
          <p>
            The service is operated by Alex Xin Liu, an individual developer based in New Zealand, not a company. It
            is provided as a free public tool and is not a commercial product.
          </p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "2. Accounts and age",
      content: (
        <>
          <p>
            You do not need an account to use the editor. An account is only required for cloud workspace sync.
            Accounts are managed through Clerk, our authentication provider.
          </p>
          <ul>
            <li>You must give accurate sign-up information and keep your login credentials secure.</li>
            <li>You are responsible for activity that happens under your account.</li>
            <li>
              You can have your account deleted at any time by emailing{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. When a Clerk account is deleted, our database
              removes the synced workspace and user record that belong to it.
            </li>
            <li>
              To create an account you must be at least 13 years old in the United States and the United Kingdom, 14
              in mainland China, and the age of digital consent in your EU country (13 to 16). Younger students should
              use the editor without an account or have a parent or guardian create and manage the account.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "your-content",
      title: "3. Your content",
      content: (
        <>
          <p>The pseudocode, files, and workspace layouts you create belong to you. We claim no ownership over them.</p>
          <p>
            When you use cloud sync, you grant us permission to store and transmit your content only as needed to
            provide the sync feature back to you. We do not read, sell, or use your workspaces for any other purpose,
            including training software.
          </p>
          <p>
            You agree not to store content that is illegal where you or we are located, that infringes someone
            else&apos;s rights, or that contains malware.
          </p>
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
            <li>
              Probe, scan, or overload the service or its providers, except as permitted by our{" "}
              <Link href={localePath("en", "/security")}>security policy</Link>.
            </li>
            <li>Automate requests to the sync API at volumes a person could not produce by hand.</li>
            <li>Use the service to distribute spam, malware, or abusive material.</li>
            <li>Use the service in a way that breaks the law where you live.</li>
          </ul>
          <p>We may suspend or remove accounts that break these rules, and we will tell you why unless the law prevents it.</p>
        </>
      ),
    },
    {
      id: "education",
      title: "5. Educational use",
      content: (
        <>
          <p>
            The compiler follows the pseudocode conventions published by Cambridge International for its Computer
            Science qualifications, as we understand them. {productName} is an independent project and is not
            affiliated with, endorsed by, or connected to Cambridge University Press &amp; Assessment or any exam board.
          </p>
          <p>
            Mark schemes may accept or reject notation differently from this compiler. Use the tool to practise and
            check your logic, and follow your teacher and your syllabus for what is accepted in an exam.
          </p>
        </>
      ),
    },
    {
      id: "open-source",
      title: "6. Open-source license",
      content: (
        <>
          <p>
            The {productName} source code is published under the GNU General Public License, version 3, at{" "}
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              {githubUrl}
            </a>
            . The license governs your use of the code. These terms govern your use of the hosted service at
            pseudo.build.
          </p>
          <p>
            The {productName} name and logo identify this project. You may run your own copy of the software, but
            please do not present a fork as the official service.
          </p>
        </>
      ),
    },
    {
      id: "availability",
      title: "7. Availability and changes",
      content: (
        <>
          <p>
            The service is provided free of charge with no uptime guarantee. Features may change, be paused, or be
            removed. Where practical we will announce changes that affect stored data on the GitHub repository at
            least 30 days ahead of time.
          </p>
          <p>Keep your own copies of important work, for example by copying your code out of the editor.</p>
        </>
      ),
    },
    {
      id: "disclaimer",
      title: "8. Disclaimer and liability",
      content: (
        <>
          <p>
            The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind,
            express or implied, including fitness for a particular purpose and non-infringement. The compiler
            follows an interpretation of common pseudocode conventions and is not an official examination tool.
          </p>
          <p>
            To the fullest extent permitted by law, the operator is not liable for any indirect, incidental, special,
            or consequential loss, including lost work or lost marks, arising from your use of the service. Because
            the service is free, our total liability for any claim is limited to NZD 100.
          </p>
          <p>
            Nothing in these terms limits liability for fraud, for death or personal injury caused by negligence, or
            any right you have under consumer protection law that cannot be excluded, including the New Zealand
            Consumer Guarantees Act, the UK Consumer Rights Act, EU consumer law, and the PRC Consumer Rights
            Protection Law.
          </p>
        </>
      ),
    },
    {
      id: "termination",
      title: "9. Ending the agreement",
      content: (
        <p>
          You can stop using the service at any time and ask us to delete your account. We may end or suspend
          your access if you break these terms or if we discontinue the service. Sections 3, 6, 8, and 10 continue to
          apply afterwards.
        </p>
      ),
    },
    {
      id: "law",
      title: "10. Governing law and disputes",
      content: (
        <>
          <p>
            These terms are governed by the laws of New Zealand, and disputes will be handled in the courts of New
            Zealand.
          </p>
          <p>
            If you are a consumer in the European Union, the United Kingdom, or mainland China, you keep the
            protection of the mandatory consumer laws of your country and may bring a claim in your local courts.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "11. Changes to these terms",
      content: (
        <p>
          We may update these terms. The effective date at the top of this page shows the current version, and the
          full history is in the repository. For material changes we will give account holders at least 14 days&apos;
          notice by email. Continued use after a change takes effect means you accept the new terms.
        </p>
      ),
    },
    {
      id: "contact",
      title: "12. Contact",
      content: (
        <p>
          Questions about these terms can be sent to <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or raised
          as an issue on{" "}
          <a href={`${githubUrl}/issues`} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          . For account or privacy matters, see the <Link href={localePath("en", "/privacy")}>privacy policy</Link>.
        </p>
      ),
    },
  ],
};
