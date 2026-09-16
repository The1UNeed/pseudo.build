import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { formatDate, localePath, localeTags, localeUrl, pageMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale } from "@/i18n/server";
import { docs, getDoc, productName } from "@/lib/seo-content";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const doc = getDoc(locale, slug);
  if (!doc) return {};

  const base = pageMetadata(
    locale,
    `/docs/${doc.slug}`,
    doc.title,
    doc.description,
    getDictionary(locale).meta.ogImageAlt,
  );
  return { ...base, openGraph: { ...base.openGraph, type: "article", modifiedTime: doc.updated } };
}

export default async function DocPage({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const doc = getDoc(locale, slug);
  if (!doc) notFound();
  const t = getDictionary(locale).docs;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": ["TechArticle", "LearningResource"],
      headline: doc.title,
      description: doc.description,
      dateModified: doc.updated,
      inLanguage: localeTags[locale],
      url: localeUrl(locale, `/docs/${doc.slug}`),
      learningResourceType: "reference",
      educationalLevel: "secondary",
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      isAccessibleForFree: true,
      author: { "@type": "Organization", name: productName },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: t.back, item: localeUrl(locale, "/docs") },
        { "@type": "ListItem", position: 3, name: doc.title, item: localeUrl(locale, `/docs/${doc.slug}`) },
      ],
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader locale={locale} active="docs" />
      <article className="site-wrap max-w-3xl py-12 md:py-16">
        <Link href={localePath(locale, "/docs")} className="inline-flex items-center gap-2 text-sm font-bold">
          <ArrowLeft size={16} /> {t.back}
        </Link>
        <h1 className="site-h1 mt-6 text-[2.4rem] md:text-[3.4rem]">{doc.title}</h1>
        <p className="site-lede mt-5">{doc.description}</p>
        <p className="mt-3 text-xs text-[var(--ink-3)]">
          {t.updated} {formatDate(locale, doc.updated)}
        </p>

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
          <Link href={localePath(locale, "/app")} className="site-btn site-btn-accent">
            {t.tryIt} <Play size={16} />
          </Link>
          <Link href={localePath(locale, "/manual")} className="site-btn site-btn-ghost">
            {t.openManual}
          </Link>
        </div>
      </article>
    </main>
  );
}
