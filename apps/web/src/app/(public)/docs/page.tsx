import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { docs, siteUrl } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Learn the pseudocode syntax Pseudo Build compiles: variables, selection, loops, arrays, flowcharts, workspace saving, and debugging.",
  alternates: {
    canonical: "/docs",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
    { "@type": "ListItem", position: 2, name: "Docs", item: `${siteUrl}/docs` },
  ],
};

export default function DocsIndexPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader active="docs" />
      <section className="site-wrap py-14 md:py-20">
        <p className="site-eyebrow">documentation</p>
        <h1 className="site-h1 mt-4">Syntax the compiler understands.</h1>
        <p className="site-lede mt-5 max-w-2xl">
          Each guide is short on purpose. Read it, open the editor, and try the example before moving on.
        </p>
      </section>
      <section className="site-wrap grid gap-4 pb-20 md:grid-cols-2">
        {docs.map((doc, index) => (
          <Link key={doc.slug} href={`/docs/${doc.slug}`} className="site-card p-6">
            <span className="site-chip">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight">{doc.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{doc.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
              Read guide <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
