import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { localePath, localeTags, localeUrl, localizedMetadata, ogImage } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale } from "@/i18n/server";
import { getPost, posts, productName } from "@/lib/seo-content";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const post = getPost(locale, slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: localizedMetadata(locale, `/blog/${post.slug}`),
    openGraph: {
      title: `${post.title} | ${productName}`,
      description: post.description,
      url: localeUrl(locale, `/blog/${post.slug}`),
      type: "article",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [ogImage],
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const post = getPost(locale, slug);
  if (!post) notFound();
  const t = getDictionary(locale);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: localeTags[locale],
      keywords: post.tags.join(", "),
      url: localeUrl(locale, `/blog/${post.slug}`),
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      author: { "@type": "Organization", name: productName },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t.docs.breadcrumbHome, item: localeUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: t.blog.back, item: localeUrl(locale, "/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: localeUrl(locale, `/blog/${post.slug}`) },
      ],
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader locale={locale} active="blog" />
      <article className="site-wrap max-w-3xl py-12 md:py-16">
        <Link href={localePath(locale, "/blog")} className="inline-flex items-center gap-2 text-sm font-bold">
          <ArrowLeft size={16} /> {t.blog.back}
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">
          {post.date} · {post.readingTime}
        </p>
        <h1 className="site-h1 mt-4 text-[2.4rem] md:text-[3.4rem]">{post.title}</h1>
        <p className="site-lede mt-5">{post.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="site-chip">
              {tag}
            </span>
          ))}
        </div>

        <div className="site-prose mt-4">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href={localePath(locale, "/app")} className="site-btn site-btn-accent">
            {t.blog.tryIt} <Play size={16} />
          </Link>
          <Link href={localePath(locale, "/docs")} className="site-btn site-btn-ghost">
            {t.blog.moreDocs}
          </Link>
        </div>
      </article>
    </main>
  );
}
