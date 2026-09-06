import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { posts, productName, siteUrl } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes from Pseudo Build on pseudocode tracing, loops, compiler errors, and browser-based practice.",
  alternates: {
    canonical: "/blog",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: `${productName} Blog`,
  url: `${siteUrl}/blog`,
};

export default function BlogIndexPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader active="blog" />
      <section className="site-wrap py-14 md:py-20">
        <p className="site-eyebrow">blog</p>
        <h1 className="site-h1 mt-4">Notes on writing better pseudocode.</h1>
        <p className="site-lede mt-5 max-w-2xl">
          Short guides for students and teachers who practise algorithms with a compiler that talks back.
        </p>
      </section>
      <section className="site-wrap grid gap-4 pb-20 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="site-card p-6">
            <p className="font-mono text-xs text-[var(--ink-3)]">
              {post.date} · {post.readingTime}
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
              Read post <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
