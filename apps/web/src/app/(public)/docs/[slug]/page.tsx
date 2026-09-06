import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { docs, getDoc, productName, siteUrl } from "@/lib/seo-content";

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
      title: `${doc.title} | ${productName}`,
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
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader active="docs" />
      <article className="site-wrap max-w-3xl py-12 md:py-16">
        <Link href="/docs" className="inline-flex items-center gap-2 text-sm font-bold">
          <ArrowLeft size={16} /> Docs
        </Link>
        <h1 className="site-h1 mt-6 text-[2.4rem] md:text-[3.4rem]">{doc.title}</h1>
        <p className="site-lede mt-5">{doc.description}</p>
        <p className="mt-3 font-mono text-xs text-[var(--ink-3)]">updated {doc.updated}</p>

        <div className="site-prose mt-6">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.example ? <pre className="site-code mt-5">{section.example}</pre> : null}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/app" className="site-btn site-btn-accent">
            Try it in the editor <Play size={16} />
          </Link>
          <Link href="/manual" className="site-btn site-btn-ghost">
            Open manual
          </Link>
        </div>
      </article>
    </main>
  );
}
