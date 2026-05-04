import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getPost, posts, siteUrl } from "@/lib/seo-content";

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
      title: `${post.title} | PseudoEditor`,
      description: post.description,
      url: `${siteUrl}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
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
        name: "PseudoEditor",
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
    <main className="min-h-screen bg-[#f7f8f3] text-[#151716]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article className="mx-auto max-w-3xl px-5 py-10 md:py-16">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-black text-[#b3412e]">
          <ArrowLeft size={16} /> Blog
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-[#b3412e]">
          {post.date} / {post.readingTime}
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-8 text-[#4b5650]">{post.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#0b6e4f]">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-10 space-y-8 rounded-lg border border-[#d7ddd0] bg-white p-6">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-black">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="leading-7 text-[#4b5650]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/app" className="inline-flex items-center gap-2 rounded-md bg-[#151716] px-4 py-3 text-sm font-bold text-white">
            Practice in the editor <ExternalLink size={16} />
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-2 rounded-md border border-[#c7d0c0] px-4 py-3 text-sm font-bold text-[#151716]">
            Browse docs
          </Link>
        </div>
      </article>
    </main>
  );
}
