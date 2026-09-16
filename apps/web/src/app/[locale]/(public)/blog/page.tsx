import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { formatDate, localePath, localeTags, localeUrl, pageMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { getPosts } from "@/lib/seo-content";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return pageMetadata(locale, "/blog", t.blogTitle, t.blogDescription, t.ogImageAlt);
}

export default async function BlogIndexPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.blog;
  const posts = getPosts(locale);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: dict.meta.blogName,
    url: localeUrl(locale, "/blog"),
    inLanguage: localeTags[locale],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader locale={locale} active="blog" />
      <section className="site-wrap py-14 md:py-20">
        <p className="site-eyebrow">{t.eyebrow}</p>
        <h1 className="site-h1 mt-4">{t.title}</h1>
        <p className="site-lede mt-5 max-w-2xl">{t.lede}</p>
      </section>
      <section className="site-wrap grid gap-4 pb-20 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.slug} href={localePath(locale, `/blog/${post.slug}`)} className="site-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">
              {formatDate(locale, post.date)} · {post.readingTime}
            </p>
            <h2 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight">{post.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{post.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="site-chip">
                  {tag}
                </span>
              ))}
            </div>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
              {t.readPost} <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
