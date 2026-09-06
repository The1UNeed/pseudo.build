import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bug,
  Cloud,
  Code2,
  GitBranch,
  Lock,
  Play,
  ScrollText,
} from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import {
  authorName,
  docs,
  faqItems,
  githubUrl,
  homeSeoDescription,
  homeSeoTitle,
  organizationName,
  posts,
  productName,
  productSlogan,
  productTagline,
  seoKeywords,
  siteUrl,
} from "@/lib/seo-content";

export const metadata: Metadata = {
  title: {
    absolute: homeSeoTitle,
  },
  description: homeSeoDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: productName,
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: [{ url: "/icon.png?v=3", width: 512, height: 512, alt: "Pseudo Build app icon" }],
  },
  twitter: {
    card: "summary",
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: ["/icon.png?v=3"],
  },
};

const features = [
  {
    icon: Code2,
    index: "01",
    title: "Strict compiler",
    body: "Tokenize, parse, validate, and compile structured pseudocode with line and column diagnostics that point at the real mistake.",
  },
  {
    icon: Play,
    index: "02",
    title: "Runs in the browser",
    body: "A Rust runtime compiled to WebAssembly executes your program on your machine, including interactive INPUT prompts.",
  },
  {
    icon: GitBranch,
    index: "03",
    title: "Flowchart view",
    body: "Switch between source and a generated flowchart to reason about decisions, loops, and processes visually.",
  },
  {
    icon: Bug,
    index: "04",
    title: "Debug with intent",
    body: "Read the first diagnostic, fix it, run again. Diagnostics are ordered so cascading errors do not bury the cause.",
  },
  {
    icon: Cloud,
    index: "05",
    title: "Workspaces that follow you",
    body: "Work in memory, in local browser storage, or sign in to sync a multi-file workspace across devices.",
  },
  {
    icon: Lock,
    index: "06",
    title: "Open and auditable",
    body: "Every line of the editor, compiler, and runtime is published under the GPL v3. No trackers, no paywall.",
  },
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: productName,
    alternateName: [
      "Pseudo Build editor",
      "Pseudo code editor and compiler",
      "Pseudocode editor",
      "Pseudocode compiler",
    ],
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: productTagline,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: organizationName,
    },
    isAccessibleForFree: true,
    license: "https://www.gnu.org/licenses/gpl-3.0.html",
    keywords: seoKeywords.join(", "),
    featureList: [
      "Pseudocode editor",
      "Pseudocode compiler",
      "Browser pseudocode runner",
      "Line-level compiler diagnostics",
      "Flowchart generation",
      "Multi-file workspaces with cloud sync",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: productName,
    url: siteUrl,
    publisher: {
      "@type": "Organization",
      name: organizationName,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

function HeroWindow() {
  return (
    <div className="site-window site-reveal site-reveal-3" aria-hidden="true">
      <div className="site-window-bar">
        <span className="site-window-dot" />
        <span className="site-window-dot" />
        <span className="site-window-dot" />
        <span className="ml-3">main.pseudo</span>
        <span className="ml-auto text-[#7fd1b5]">compiled in 3 ms</span>
      </div>
      <div className="grid md:grid-cols-[150px_1fr]">
        <aside className="hidden border-r border-white/10 p-4 text-[11px] text-white/55 md:block">
          <p className="mb-3 font-semibold uppercase text-white/80">Workspace</p>
          <p className="rounded bg-white/10 px-2 py-1 text-white">main.pseudo</p>
          <p className="px-2 py-1">validate.pseudo</p>
          <p className="px-2 py-1">search.pseudo</p>
        </aside>
        <div>
          <pre className="m-0 overflow-x-auto p-5 font-mono text-[13px] leading-7">
            <span className="site-token-cmt">{"// Sum the first five integers"}</span>
            {"\n"}
            <span className="site-token-kw">DECLARE</span> Number : <span className="site-token-type">INTEGER</span>
            {"\n"}
            <span className="site-token-kw">DECLARE</span> Total : <span className="site-token-type">INTEGER</span>
            {"\n"}
            Total <span className="site-token-kw">{"<-"}</span> <span className="site-token-num">0</span>
            {"\n\n"}
            <span className="site-token-kw">FOR</span> Number <span className="site-token-kw">{"<-"}</span>{" "}
            <span className="site-token-num">1</span> <span className="site-token-kw">TO</span>{" "}
            <span className="site-token-num">5</span>
            {"\n"}
            {"    "}Total <span className="site-token-kw">{"<-"}</span> Total + Number
            {"\n"}
            <span className="site-token-kw">NEXT</span> Number
            {"\n\n"}
            <span className="site-token-kw">OUTPUT</span> <span className="site-token-str">{'"Total = "'}</span>, Total
          </pre>
          <div className="border-t border-white/10 bg-[#111313] p-4 font-mono text-[12px]">
            <p className="text-white/50">Terminal</p>
            <p className="mt-1 text-[#30d158]">&gt; Total = 15</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main>
      <JsonLd />
      <PublicHeader />

      <section className="site-wrap grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="site-eyebrow site-reveal">Free and open source</p>
          <h1 className="site-h1 site-reveal site-reveal-2 mt-5">
            Build pseudo code
            <br />
            <span className="text-[var(--accent)]">that actually runs.</span>
          </h1>
          <p className="site-lede site-reveal site-reveal-3 mt-6 max-w-xl">{productSlogan} Write structured pseudocode, compile it with real diagnostics, and run it in your browser. Build your pseudo code project freely and creatively.</p>
          <div className="site-reveal site-reveal-4 mt-8 flex flex-wrap gap-3">
            <Link href="/app" className="site-btn site-btn-accent">
              Start building <Play size={16} />
            </Link>
            <Link href="/docs" className="site-btn site-btn-ghost">
              Read the docs <ArrowRight size={16} />
            </Link>
          </div>
          <p className="site-reveal site-reveal-4 mt-6 text-sm text-[var(--ink-3)]">
            No account needed. Sign in only if you want cloud sync.
          </p>
        </div>
        <HeroWindow />
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--paper-2)]">
        <div className="site-wrap py-16 md:py-20">
          <p className="site-eyebrow">what you get</p>
          <h2 className="site-h2 mt-3 max-w-2xl">An editor, a compiler, and a runtime. Nothing to install.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="site-card site-card-hover p-6">
                  <span className="inline-flex rounded-lg bg-[var(--paper-2)] p-2.5 text-[var(--accent)]">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="site-wrap grid gap-10 py-16 md:py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="site-eyebrow">learn while you build</p>
          <h2 className="site-h2 mt-3">Docs that sit next to the editor.</h2>
          <p className="site-lede mt-5 max-w-lg">
            Short, practical guides for the syntax the compiler accepts. Read one, then try it in the editor a click away.
          </p>
          <Link href="/manual" className="site-btn mt-7">
            Open the manual <ScrollText size={16} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {docs.slice(0, 4).map((doc, index) => (
            <Link key={doc.slug} href={`/docs/${doc.slug}`} className="site-card p-5">
              <span className="site-chip">Guide {index + 1}</span>
              <h3 className="mt-4 font-extrabold tracking-tight">{doc.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{doc.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-white">
        <div className="site-wrap py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="site-eyebrow">blog</p>
              <h2 className="site-h2 mt-3">Notes on writing better pseudocode.</h2>
            </div>
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
              All posts <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="site-card bg-[var(--paper)] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">{post.readingTime}</p>
                <h3 className="mt-3 text-lg font-extrabold leading-snug tracking-tight">{post.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{post.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="site-wrap grid gap-10 py-16 md:py-20 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="site-eyebrow">questions</p>
          <h2 className="site-h2 mt-3">Answers before you ask.</h2>
          <div className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {faqItems.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  {item.question}
                  <span className="font-mono text-[var(--accent)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-7 text-[var(--ink-2)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[var(--radius)] bg-[var(--ink)] p-8 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7fd1b5]">Open source</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Read the code. Run it yourself. Make it yours.</h2>
            <p className="mt-4 leading-7 text-white/70">
              Pseudo Build is licensed under the GNU GPL v3. Clone the repository, run it locally, file issues, and send pull requests.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="site-btn site-btn-accent">
              View on GitHub <ArrowUpRight size={16} />
            </a>
            <Link href="/security" className="site-btn site-btn-ghost !border-white/30 !text-white hover:!bg-white/10">
              Security policy
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
