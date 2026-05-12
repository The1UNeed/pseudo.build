import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { docs, getDoc, siteUrl } from "@/lib/seo-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);

  if (!doc) {
    return {};
  }

  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: `/docs/${doc.slug}`,
    },
    openGraph: {
      title: `${doc.title} | PseudoEditor`,
      description: doc.description,
      url: `${siteUrl}/docs/${doc.slug}`,
      type: "article",
    },
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDoc(slug);

  if (!doc) {
    notFound();
  }

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: doc.title,
      description: doc.description,
      dateModified: doc.updated,
      url: `${siteUrl}/docs/${doc.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Docs", item: `${siteUrl}/docs` },
        { "@type": "ListItem", position: 3, name: doc.title, item: `${siteUrl}/docs/${doc.slug}` },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#151716]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader active="docs" />
      <article className="mx-auto max-w-3xl px-5 py-10 md:py-16">
        <Link href="/docs" className="inline-flex items-center gap-2 text-sm font-black text-[#0b6e4f]">
          <ArrowLeft size={16} /> Docs
        </Link>
        <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl">{doc.title}</h1>
        <p className="mt-5 text-lg leading-8 text-[#4b5650]">{doc.description}</p>
        <p className="mt-3 text-sm font-bold text-[#6b746e]">Updated {doc.updated}</p>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section) => (
            <section key={section.heading} className="rounded-lg border border-[#d7ddd0] bg-white p-6">
              <h2 className="text-2xl font-black">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="leading-7 text-[#4b5650]">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.example ? (
                <pre className="mt-5 overflow-x-auto rounded-md bg-[#151716] p-4 font-mono text-sm leading-6 text-[#dce8d1]">
                  {section.example}
                </pre>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/app" className="inline-flex items-center gap-2 rounded-md bg-[#151716] px-4 py-3 text-sm font-bold text-white">
            Try it in the editor <ExternalLink size={16} />
          </Link>
          <Link href="/manual" className="inline-flex items-center gap-2 rounded-md border border-[#c7d0c0] px-4 py-3 text-sm font-bold text-[#151716]">
            Open manual
          </Link>
        </div>
      </article>
    </main>
  );
}
