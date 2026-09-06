import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Code2, FileText, GitBranch, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { productName, siteUrl } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Manual",
  description:
    "The Pseudo Build pseudocode manual: syntax rules, control flow, arrays, trace tables, and exam-style practice.",
  alternates: {
    canonical: "/manual",
  },
};

const manualSections = [
  {
    icon: Code2,
    title: "Core syntax",
    body: "Use DECLARE, assignment, INPUT, OUTPUT, comments, constants, and typed values in a consistent exam-style format.",
    bullets: ["Assignment uses <-", "Variables use explicit types", "Comments start with //"],
  },
  {
    icon: GitBranch,
    title: "Selection and loops",
    body: "Pick IF, CASE, FOR, WHILE, or REPEAT UNTIL based on when the condition is known and when it should be tested.",
    bullets: ["FOR for known counts", "WHILE can run zero times", "REPEAT UNTIL runs first"],
  },
  {
    icon: FileText,
    title: "Arrays and records",
    body: "Represent list-style data with indexed arrays, then process values through counted loops and clear bounds.",
    bullets: ["Indexes are explicit", "Bounds are part of declaration", "Nested loops cover tables"],
  },
  {
    icon: BookOpen,
    title: "Tracing and debugging",
    body: "Use trace tables, line-by-line state changes, and compiler diagnostics to catch logic and syntax errors earlier.",
    bullets: ["Track changed variables", "Check block endings", "Test edge cases"],
  },
] as const;

const examples = [
  {
    title: "Counted total",
    code: `DECLARE Number : INTEGER
DECLARE Total : INTEGER
Total <- 0

FOR Number <- 1 TO 5
    Total <- Total + Number
NEXT Number

OUTPUT "Total = ", Total`,
  },
  {
    title: "Input validation",
    code: `DECLARE Choice : INTEGER

REPEAT
    OUTPUT "Choose 1 to 4"
    INPUT Choice
UNTIL Choice >= 1 AND Choice <= 4

OUTPUT "Accepted"`,
  },
] as const;

const checklist = [
  "Declare every variable and array before use.",
  "Initialize totals, counters, and flags before loops.",
  "Use the loop type that matches the question.",
  "Close every IF, CASE, and loop block clearly.",
  "Trace the program with at least one normal input and one edge case.",
] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: `${productName} Pseudocode Manual`,
  description: metadata.description,
  url: `${siteUrl}/manual`,
};

export default function ManualPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader active="manual" />

      <section className="site-wrap py-14 md:py-20">
        <p className="site-eyebrow">manual</p>
        <h1 className="site-h1 mt-4">The working reference.</h1>
        <p className="site-lede mt-5 max-w-2xl">
          Syntax, control flow, and tracing habits in one place. Keep it open beside the editor while you build.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="site-btn site-btn-accent">
            Open editor <Play size={16} />
          </Link>
          <Link href="/docs" className="site-btn site-btn-ghost">
            Browse docs <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="site-wrap grid gap-4 pb-16 md:grid-cols-2">
        {manualSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <article key={section.title} className="site-card site-card-hover p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex rounded-md border-[1.5px] border-[var(--ink)] bg-[var(--paper)] p-2">
                  <Icon size={20} />
                </span>
                <span className="font-mono text-xs text-[var(--ink-3)]">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{section.body}</p>
              <ul className="mt-5 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm font-semibold text-[var(--ink-2)]">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" size={16} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="border-y-[1.5px] border-[var(--line)] bg-white">
        <div className="site-wrap py-16">
          <p className="site-eyebrow">examples</p>
          <h2 className="site-h2 mt-3">Small patterns you can run.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {examples.map((example) => (
              <article key={example.title}>
                <h3 className="text-lg font-extrabold tracking-tight">{example.title}</h3>
                <pre className="site-code mt-4">{example.code}</pre>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-wrap grid gap-8 py-16 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="site-eyebrow">before you submit</p>
          <h2 className="site-h2 mt-3">A compact checking routine.</h2>
          <p className="site-lede mt-5">
            Treat the manual as a working checklist, not a long rules page. Write the algorithm, run it, then trace the parts that change state.
          </p>
        </div>
        <div className="site-card p-6">
          <ul className="space-y-4">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--ink-2)]">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
