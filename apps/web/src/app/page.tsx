import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cloud,
  Code2,
  FileText,
  GitBranch,
  Play,
  TerminalSquare,
} from "lucide-react";
import { docs, faqItems, posts, productTagline, siteUrl } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "PseudoEditor - Browser Pseudocode Compiler",
  description:
    "Use PseudoEditor to write, compile, run, debug, and learn IGCSE-style pseudocode in a full browser editor.",
  alternates: {
    canonical: "/",
  },
};

const features = [
  {
    icon: Code2,
    title: "Strict pseudocode compiler",
    body: "Tokenize, parse, validate, and compile structured pseudocode with line-level diagnostics.",
  },
  {
    icon: Play,
    title: "Python execution",
    body: "Run generated Python directly in the browser terminal, including interactive INPUT programs.",
  },
  {
    icon: GitBranch,
    title: "Flowchart support",
    body: "Switch between source and visual control-flow thinking for decisions, loops, and processes.",
  },
  {
    icon: Cloud,
    title: "Workspace saving",
    body: "Use local browser storage in development and signed-in cloud workspace sync on pseudoeditor.dev.",
  },
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PseudoEditor",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: productTagline,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PseudoEditor",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/docs?query={search_term_string}`,
      "query-input": "required name=search_term_string",
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

function EditorBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#101214]" />
      <div className="absolute inset-x-0 top-0 h-20 bg-[#0b6e4f]" />
      <div className="absolute left-1/2 top-16 w-[min(1120px,92vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-white/14 bg-[#191d1d] shadow-2xl">
        <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#242827] px-4">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-4 text-xs font-semibold text-white/64">main.pseudo</span>
        </div>
        <div className="grid min-h-[520px] grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-white/10 bg-[#222625] p-4 text-xs text-white/55 md:block">
            <div className="mb-4 font-semibold uppercase text-white/80">Workspace</div>
            <div className="space-y-2">
              <div className="rounded bg-white/8 px-3 py-2 text-white">main.pseudo</div>
              <div className="px-3 py-2">loops.pseudo</div>
              <div className="px-3 py-2">array-search.pseudo</div>
            </div>
          </aside>
          <div className="grid grid-rows-[1fr_150px]">
            <pre className="m-0 overflow-hidden p-6 font-mono text-sm leading-7 text-[#e5e5ea] opacity-90 md:text-base">
{`DECLARE Number : INTEGER
DECLARE Total : INTEGER
Total <- 0

FOR Number <- 1 TO 5
    Total <- Total + Number
NEXT Number

OUTPUT "Total = ", Total`}
            </pre>
            <div className="border-t border-white/10 bg-[#111313] p-4 font-mono text-sm text-[#30d158]">
              <div className="mb-2 flex items-center gap-2 text-white/60">
                <TerminalSquare size={16} /> Terminal
              </div>
              <div>&gt; Total = 15</div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,18,20,0.94),rgba(16,18,20,0.76)_45%,rgba(16,18,20,0.22))]" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#151716]">
      <JsonLd />
      <section className="relative min-h-[88vh] overflow-hidden text-white">
        <EditorBackdrop />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <Image src="/branding/app-icon.svg" alt="" width={36} height={36} />
            <span>pseudoeditor.dev</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-semibold text-white/76 md:flex">
            <Link href="/docs">Docs</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/manual">Manual</Link>
          </div>
          <Link
            href="/app"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#151716] transition hover:bg-[#dce8d1]"
          >
            Open app <ArrowRight size={16} />
          </Link>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[calc(88vh-80px)] max-w-7xl items-center px-5 pb-20 pt-16 md:px-8">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex rounded-md border border-white/18 bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#dce8d1]">
              Browser pseudocode compiler
            </p>
            <h1 className="text-5xl font-black leading-[1.02] md:text-7xl">
              PseudoEditor
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/78 md:text-xl">
              Write, compile, run, and debug IGCSE-style pseudocode in a full browser editor with docs, flowcharts, terminal output, and workspace saving.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-[#dce8d1] px-5 text-sm font-black text-[#111313] transition hover:bg-white"
              >
                Launch editor <Play size={17} />
              </Link>
              <Link
                href="/docs"
                className="inline-flex h-12 items-center gap-2 rounded-md border border-white/22 px-5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Read docs <BookOpen size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#d7ddd0] bg-[#eef3e9] px-5 py-14 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-lg border border-[#d7ddd0] bg-white p-5 shadow-sm">
                <Icon className="mb-5 text-[#0b6e4f]" size={24} />
                <h2 className="text-lg font-black">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#4b5650]">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b3412e]">Learn while you build</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">Docs and examples beside the app.</h2>
            <p className="mt-5 max-w-xl leading-7 text-[#4b5650]">
              The new pseudoeditor.dev site gives search engines useful learning pages while giving students a direct path from explanation to practice.
            </p>
            <Link href="/manual" className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#151716] px-4 py-3 text-sm font-bold text-white">
              Open manual <FileText size={16} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {docs.slice(0, 4).map((doc) => (
              <Link key={doc.slug} href={`/docs/${doc.slug}`} className="rounded-lg border border-[#d7ddd0] bg-white p-5 transition hover:border-[#0b6e4f]">
                <CheckCircle2 className="mb-4 text-[#1f4e79]" size={22} />
                <h3 className="font-black">{doc.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c665f]">{doc.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#d7ddd0] bg-white px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b6e4f]">Blog</p>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">Pseudocode practice notes.</h2>
            </div>
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-black text-[#0b6e4f]">
              View all posts <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="rounded-lg border border-[#d7ddd0] bg-[#f7f8f3] p-5 transition hover:border-[#b3412e]">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b3412e]">{post.readingTime}</p>
                <h3 className="mt-3 text-xl font-black">{post.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5c665f]">{post.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-black md:text-4xl">Questions</h2>
          <div className="mt-6 divide-y divide-[#d7ddd0] rounded-lg border border-[#d7ddd0] bg-white">
            {faqItems.map((item) => (
              <details key={item.question} className="group p-5">
                <summary className="cursor-pointer font-black">{item.question}</summary>
                <p className="mt-3 leading-7 text-[#4b5650]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
