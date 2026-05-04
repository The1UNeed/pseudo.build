import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Home } from "lucide-react";
import { docs, siteUrl } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Pseudocode Docs",
  description:
    "Learn PseudoEditor syntax, variables, selection, loops, arrays, flowcharts, workspace saving, and compiler debugging.",
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
    <main className="min-h-screen bg-[#f7f8f3] text-[#151716]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="border-b border-[#d7ddd0] bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black">
            <Home size={16} /> PseudoEditor
          </Link>
          <Link href="/app" className="rounded-md bg-[#151716] px-4 py-2 text-sm font-bold text-white">
            Open app
          </Link>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b6e4f]">Documentation</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">Pseudocode docs for browser practice.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4b5650]">
          Learn the syntax PseudoEditor compiles, then jump into the browser app to test the idea immediately.
        </p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-2">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            href={`/docs/${doc.slug}`}
            className="rounded-lg border border-[#d7ddd0] bg-white p-5 transition hover:border-[#0b6e4f]"
          >
            <BookOpen className="mb-5 text-[#1f4e79]" size={24} />
            <h2 className="text-xl font-black">{doc.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#4b5650]">{doc.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#0b6e4f]">
              Read guide <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
