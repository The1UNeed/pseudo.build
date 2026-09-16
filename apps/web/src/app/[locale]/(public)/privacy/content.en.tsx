import Link from "next/link";
import type { LegalContent } from "@/app/components/LegalPage";
import { localePath } from "@/i18n/config";
import { contactEmail, githubUrl, productName } from "@/lib/seo-content";

const providers = [
  { name: "Vercel Inc.", role: "Hosting, API routes, request logs, and privacy-friendly analytics", country: "United States", policy: "https://vercel.com/legal/privacy-policy" },
  { name: "Clerk, Inc.", role: "Authentication and account management", country: "United States", policy: "https://clerk.com/legal/privacy" },
  { name: "Convex, Inc.", role: "Database for synced workspaces", country: "United States", policy: "https://www.convex.dev/legal/privacy" },
];

export const privacyEn: LegalContent = {
  eyebrow: "privacy",
  title: "We collect as little as the product allows.",
  summary: `This policy explains what data ${productName} handles, why, where it lives, and how to remove it. The short version: your code stays in your browser unless you sign in. Signing in turns on cloud sync, which saves your workspace to our database automatically.`,
  sections: [
    {
      id: "controller",
      title: "1. Who is responsible",
      content: (
        <>
          <p>
            {productName} is run by Alex Xin Liu, an individual developer based in New Zealand, who is the data
            controller (in China, the personal information handler) for the data described here. There is no company,
            no advertising, and no data broker behind the service.
          </p>
          <p>
            For any privacy request, write to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Please do not put
            personal details in public GitHub issues.
          </p>
        </>
      ),
    },
    {
      id: "summary",
      title: "2. What we collect, at a glance",
      content: (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>When</th>
              <th>Where it is stored</th>
              <th>Kept until</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Your pseudocode and workspace layout</td>
              <td>Always, while you edit</td>
              <td>Your browser only. Also Convex, once you sign in.</td>
              <td>You delete it in the editor or your account is deleted.</td>
            </tr>
            <tr>
              <td>Email address, name, profile image, sign-in method</td>
              <td>Only if you create an account</td>
              <td>Clerk. Email and name are also copied to Convex next to your workspace.</td>
              <td>Your account is deleted.</td>
            </tr>
            <tr>
              <td>Aggregate page views and load timings</td>
              <td>On the public website, production only</td>
              <td>Vercel Analytics and Speed Insights. No cookies, no cross-site tracking.</td>
              <td>Aggregated. Vercel discards the daily visitor hash after 24 hours.</td>
            </tr>
            <tr>
              <td>Request logs (IP address, user agent, path, timestamp)</td>
              <td>Every request</td>
              <td>Vercel</td>
              <td>Vercel&apos;s short log retention for operations and abuse prevention.</td>
            </tr>
          </tbody>
        </table>
      ),
    },
    {
      id: "no-account",
      title: "3. Using the editor without an account",
      content: (
        <>
          <p>
            The compiler and runtime run entirely in your browser using WebAssembly. Your code is never sent to a
            server to compile or execute, and we cannot see it.
          </p>
          <p>
            On the public site, a signed-out session keeps your workspace in memory only and it is gone when you close
            the tab. On localhost or the desktop build, the workspace is saved to your browser&apos;s IndexedDB so it
            survives reloads. Theme, panel sizes, and auto-save preferences are kept in local storage. You can clear all
            of this through your browser settings.
          </p>
        </>
      ),
    },
    {
      id: "account",
      title: "4. Accounts and cloud sync",
      content: (
        <>
          <p>
            When you sign in, authentication is handled by <a href="https://clerk.com" target="_blank" rel="noopener noreferrer">Clerk</a>.
            Clerk stores your email address, name, profile image, sign-in method, and session information. Clerk sets
            cookies that are strictly necessary to keep you signed in and sets no advertising or analytics cookies.
          </p>
          <p>
            While you are signed in, your workspace is saved automatically as you work. Each save is sent over HTTPS to our <a href="https://convex.dev" target="_blank" rel="noopener noreferrer">Convex</a> database
            and stored against your Clerk user ID, together with your email address and name so the record can be
            identified. Workspaces are limited in size and validated before storage.
          </p>
          <p>
            Only you can read your workspace. Access is enforced by verifying your Clerk session token on every
            request, both in the API layer and inside the database functions. We do not read, analyse, or train anything
            on your workspaces.
          </p>
        </>
      ),
    },
    {
      id: "purposes",
      title: "5. Why we process data and on what legal basis",
      content: (
        <>
          <p>We process personal data only for these purposes:</p>
          <ul>
            <li>
              <strong>Providing the editor, your account, and cloud sync.</strong> Legal basis in the EU and UK:
              performance of a contract (GDPR Article 6(1)(b)). In China: necessary to provide the service you asked
              for (PIPL Article 13(2)) and your consent when you sign up.
            </li>
            <li>
              <strong>Keeping the service secure and preventing abuse</strong>, using request logs. Legal basis:
              our legitimate interest in running a safe service (Article 6(1)(f)).
            </li>
            <li>
              <strong>Understanding aggregate usage</strong> with cookieless analytics on the public website. Legal
              basis: legitimate interest. No individual profiles are built.
            </li>
            <li>
              <strong>Complying with law</strong>, for example responding to a valid legal request (Article 6(1)(c)).
            </li>
          </ul>
          <p>
            We do not make automated decisions about you, we do not profile you, and we do not use your data for
            advertising.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "6. Cookies, local storage, and analytics",
      content: (
        <>
          <p>
            The public website sets no cookies of its own. Signing in sets Clerk&apos;s session cookies (for example{" "}
            <code>__session</code> and <code>__client_uat</code>), which are strictly necessary for the account
            feature and therefore do not require consent under the EU ePrivacy rules or the UK PECR.
          </p>
          <p>
            Vercel Analytics and Speed Insights run only on the production website. They use no cookies and do not
            fingerprint devices: a visitor is identified for at most 24 hours by a salted hash of the request, after
            which the hash is discarded (see{" "}
            <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer">
              Vercel&apos;s analytics privacy notice
            </a>
            ). They are not loaded in local or desktop builds. We do not run advertising or
            third-party marketing scripts, and we honour the fact that there is nothing to opt out of.
          </p>
          <p>Local storage and IndexedDB are used only as described in section 3 and never leave your device.</p>
        </>
      ),
    },
    {
      id: "transfers",
      title: "7. Where data is stored and international transfers",
      content: (
        <>
          <p>
            Our providers store data on servers in the United States. If you use the service from outside the United
            States, your account data and synced workspaces are transferred there.
          </p>
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Purpose</th>
                <th>Country</th>
                <th>Privacy policy</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.name}>
                  <td>{provider.name}</td>
                  <td>{provider.role}</td>
                  <td>{provider.country}</td>
                  <td>
                    <a href={provider.policy} target="_blank" rel="noopener noreferrer">
                      Link
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <strong>EU, EEA, and UK.</strong> Transfers rely on the provider&apos;s data processing agreement, which
            uses the EU Standard Contractual Clauses and the UK International Data Transfer Addendum, or the EU-US
            Data Privacy Framework where the provider is certified.
          </p>
          <p>
            <strong>Mainland China.</strong> Under the Personal Information Protection Law, we tell you here that
            the recipients above, located in the United States, will receive your email address, name, profile
            image, and synced workspace for the sole purpose of providing your account and cloud sync, by encrypted
            transfer over HTTPS. Before you create an account, the sign-in page tells you that account data is stored
            by our providers in the United States, and creating an account means you agree to this transfer. You can
            withdraw that agreement at any time by deleting your account, and you can exercise your rights against these recipients through us
            at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. If you do not want your data to leave China,
            use the editor without an account: nothing is transferred.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "8. Retention and deletion",
      content: (
        <>
          <p>
            Synced workspaces and your user record are kept until your account is deleted. When a Clerk account is
            deleted, Clerk sends a signed notification to our database, which then deletes the matching workspace and
            user record. The editor has no separate control to delete or export your synced data. Provider backups may
            persist for a limited period afterwards.
          </p>
          <p>
            Request logs are kept by Vercel for a short operational period and analytics data is aggregated, so
            neither can be traced back to you afterwards.
          </p>
          <p>
            To have your account and data deleted, or to get a copy of your data, email{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. We answer within 30 days, which is inside the deadlines set by the GDPR, the UK GDPR, the PIPL,
            and US state privacy laws.
          </p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "9. Who we share data with",
      content: (
        <>
          <p>
            We do not sell personal data, and we do not share it for targeted advertising or cross-context
            behavioural advertising in the meaning of US state privacy laws. Data is processed only by the providers in
            section 7, each acting on our instructions under its own data processing agreement.
          </p>
          <p>
            We may disclose data if required by law, for example to comply with a valid court order, or to protect the
            security of the service and its users.
          </p>
        </>
      ),
    },
    {
      id: "rights",
      title: "10. Your rights",
      content: (
        <>
          <p>
            Wherever you live, you can access, correct, export, and delete your data, and you can withdraw consent by
            deleting your account. In addition:
          </p>
          <ul>
            <li>
              <strong>EU, EEA, and UK (GDPR and UK GDPR):</strong> you can restrict or object to processing, receive
              your data in a portable format, and lodge a complaint with your national supervisory authority or the UK
              Information Commissioner&apos;s Office.
            </li>
            <li>
              <strong>United States (state privacy laws such as the CCPA/CPRA):</strong> you can know what we collect,
              delete it, correct it, and you will not be discriminated against for exercising these rights. We do not
              sell or share personal information, so there is nothing to opt out of.
            </li>
            <li>
              <strong>Mainland China (PIPL):</strong> you can know and decide how your information is handled, restrict
              or refuse processing, access and copy it, correct it, delete it, ask us to explain our rules, and
              withdraw consent. Your close relatives may exercise these rights after your death as the law allows.
            </li>
            <li>
              <strong>New Zealand (Privacy Act 2020):</strong> you can request access to and correction of your
              information, and complain to the Office of the Privacy Commissioner.
            </li>
          </ul>
          <p>
            To exercise any right, email{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. We may ask you to confirm your identity through the
            email address on your account.
          </p>
        </>
      ),
    },
    {
      id: "children",
      title: "11. Children and students",
      content: (
        <>
          <p>
            The editor works without an account and is suitable for students of any age. Nothing is collected from a
            signed-out visitor beyond the request logs and aggregate analytics described above.
          </p>
          <p>
            Accounts are for people old enough to consent to data processing where they live: 13 in the United States
            (COPPA) and the United Kingdom, 14 in mainland China, and 13 to 16 in the European Union depending on the
            country. If you are younger, use the editor without an account or ask a parent or guardian to create and
            manage the account. We do not knowingly keep accounts belonging to younger children; if you believe one
            exists, email us and we will delete it.
          </p>
          <p>
            Schools and teachers do not need to sign a data agreement to use the editor in class because no student
            data reaches us unless a student chooses to sign in.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "12. Security",
      content: (
        <p>
          All traffic is encrypted with HTTPS, access to workspaces is verified on every request, and secrets are
          kept out of the code. If a breach ever affects your data, we will notify you and the relevant authorities as
          the law requires. Details are on the <Link href={localePath("en", "/security")}>security page</Link>.
        </p>
      ),
    },
    {
      id: "changes",
      title: "13. Changes",
      content: (
        <p>
          We will update this policy if the data we handle changes. The effective date above reflects the current
          version, and every past version is available in the{" "}
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            repository history
          </a>
          . For material changes affecting account holders, we will notify you by email.
        </p>
      ),
    },
  ],
};
