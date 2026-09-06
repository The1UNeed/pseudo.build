import Link from "next/link";
import type { ReactNode } from "react";
import { PublicHeader } from "@/app/components/PublicHeader";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
};

const legalLinks = [
  { href: "/terms", label: "User agreement" },
  { href: "/privacy", label: "Privacy" },
  { href: "/security", label: "Security" },
] as const;

export function LegalPage({ eyebrow, title, summary, effectiveDate, sections }: LegalPageProps) {
  return (
    <main>
      <PublicHeader active="legal" />
      <section className="site-wrap py-14 md:py-20">
        <p className="site-eyebrow">{eyebrow}</p>
        <h1 className="site-h1 mt-4 max-w-3xl">{title}</h1>
        <p className="site-lede mt-5 max-w-2xl">{summary}</p>
        <p className="mt-4 text-xs text-[var(--ink-3)]">effective {effectiveDate}</p>
      </section>

      <section className="site-wrap grid gap-10 pb-20 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">On this page</p>
          <nav className="site-toc mt-3">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">Related</p>
          <nav className="site-toc mt-3">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="site-card site-prose max-w-3xl p-6 md:p-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>
      </section>
    </main>
  );
}
