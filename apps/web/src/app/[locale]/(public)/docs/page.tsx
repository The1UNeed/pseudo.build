import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { localePath, localeTags, localeUrl, localizedMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { getDocs } from "@/lib/seo-content";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    title: t.docsTitle,
    description: t.docsDescription,
    alternates: localizedMetadata(locale, "/docs"),
  };
}

export default async function DocsIndexPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).docs;
  const docs = getDocs(locale);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: t.back, item: localeUrl(locale, "/docs") },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      inLanguage: localeTags[locale],
      itemListElement: docs.map((doc, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: doc.title,
        url: localeUrl(locale, `/docs/${doc.slug}`),
      })),
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader locale={locale} active="docs" />
      <section className="site-wrap py-14 md:py-20">
        <p className="site-eyebrow">{t.eyebrow}</p>
        <h1 className="site-h1 mt-4">{t.title}</h1>
        <p className="site-lede mt-5 max-w-2xl">{t.lede}</p>
      </section>
      <section className="site-wrap grid gap-4 pb-20 md:grid-cols-2">
        {docs.map((doc, index) => (
          <Link key={doc.slug} href={localePath(locale, `/docs/${doc.slug}`)} className="site-card p-6">
            <span className="site-chip">
              {t.guide} {index + 1}
            </span>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight">{doc.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{doc.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
              {t.readGuide} <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
