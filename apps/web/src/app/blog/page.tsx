import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { posts, siteUrl } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Pseudocode Blog",
  description:
    "Read PseudoEditor posts about IGCSE pseudocode, tracing, loops, compiler errors, and browser-based practice.",
  alternates: {
    canonical: "/blog",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "PseudoEditor Blog",
  url: `${siteUrl}/blog`,
};

export default function BlogIndexPage() {
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
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b3412e]">Blog</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">Pseudocode practice notes.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4b5650]">
          Short guides for students and teachers using a browser pseudocode compiler for algorithm practice.
        </p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="rounded-lg border border-[#d7ddd0] bg-white p-6 transition hover:border-[#b3412e]"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b3412e]">
              {post.date} / {post.readingTime}
            </p>
            <h2 className="mt-4 text-2xl font-black">{post.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#4b5650]">{post.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-[#eef3e9] px-2 py-1 text-xs font-bold text-[#0b6e4f]">
                  {tag}
                </span>
              ))}
            </div>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#b3412e]">
              Read post <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
