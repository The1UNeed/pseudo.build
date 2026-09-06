import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { getPost, posts, productName, siteUrl } from "@/lib/seo-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | ${productName}`,
      description: post.description,
      url: `${siteUrl}/blog/${post.slug}`,
      type: "article",
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      url: `${siteUrl}/blog/${post.slug}`,
      author: {
        "@type": "Organization",
        name: productName,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
      ],
    },
  ];

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader active="blog" />
      <article className="site-wrap max-w-3xl py-12 md:py-16">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold">
          <ArrowLeft size={16} /> Blog
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
          <Link href="/app" className="site-btn site-btn-accent">
            Practise in the editor <Play size={16} />
          </Link>
          <Link href="/docs" className="site-btn site-btn-ghost">
            Browse docs
          </Link>
        </div>
      </article>
    </main>
  );
}
