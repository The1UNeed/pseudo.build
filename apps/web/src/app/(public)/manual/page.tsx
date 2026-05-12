import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Code2, FileText, GitBranch, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { siteUrl } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Pseudocode Manual",
  description:
    "Use the PseudoEditor pseudocode manual for syntax rules, control flow, arrays, trace tables, and exam-style practice.",
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
  headline: "PseudoEditor Pseudocode Manual",
  description: metadata.description,
  url: `${siteUrl}/manual`,
};

export default function ManualPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#151716]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader active="manual" />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b6e4f]">Manual</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">Pseudocode manual for practical writing.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4b5650]">
          A managed reference for the syntax, control flow, and tracing habits used across PseudoEditor. Keep it open beside the browser editor while you practise.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="inline-flex items-center gap-2 rounded-md bg-[#151716] px-4 py-3 text-sm font-bold text-white">
            Open editor <Play size={16} />
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-2 rounded-md border border-[#c7d0c0] px-4 py-3 text-sm font-bold text-[#151716]">
            Browse docs <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-2">
        {manualSections.map((section) => {
          const Icon = section.icon;
          return (
            <article key={section.title} className="rounded-lg border border-[#d7ddd0] bg-white p-6 transition hover:border-[#0b6e4f]">
              <Icon className="mb-5 text-[#1f4e79]" size={24} />
              <h2 className="text-2xl font-black">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#4b5650]">{section.body}</p>
              <ul className="mt-5 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm font-bold text-[#4b5650]">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[#0b6e4f]" size={16} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="border-y border-[#d7ddd0] bg-white px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b3412e]">Examples</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">Small patterns you can run.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {examples.map((example) => (
              <article key={example.title} className="rounded-lg border border-[#d7ddd0] bg-[#f7f8f3] p-5">
                <h3 className="text-xl font-black">{example.title}</h3>
                <pre className="mt-5 overflow-x-auto rounded-md bg-[#151716] p-4 font-mono text-sm leading-6 text-[#dce8d1]">
                  {example.code}
                </pre>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b6e4f]">Before you submit</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">A compact checking routine.</h2>
          <p className="mt-5 leading-7 text-[#4b5650]">
            Treat the manual as a working checklist, not a long rules page. Write the algorithm, run it, then trace the parts that change state.
          </p>
        </div>
        <div className="rounded-lg border border-[#d7ddd0] bg-white p-6">
          <ul className="space-y-4">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-bold leading-6 text-[#4b5650]">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#0b6e4f]" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
