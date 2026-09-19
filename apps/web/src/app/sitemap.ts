import type { MetadataRoute } from "next";
import { languageAlternates, locales, localeUrl } from "@/i18n/config";
import { practiceQuestions } from "@/lib/practice-questions";
import { docs, posts } from "@/lib/seo-content";

const staticRoutes: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/app", priority: 0.9, changeFrequency: "monthly" },
  { path: "/practice", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.8, changeFrequency: "weekly" },
  { path: "/manual", priority: 0.8, changeFrequency: "monthly" },
  { path: "/app/manual", priority: 0.5, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/security", priority: 0.2, changeFrequency: "yearly" },
];

const siteUpdated = new Date("2026-09-19");

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: Array<{ path: string; lastModified: Date; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }> = [
    ...staticRoutes.map((route) => ({ ...route, lastModified: siteUpdated })),
    ...docs.map((doc) => ({
      path: `/docs/${doc.slug}`,
      lastModified: new Date(doc.updated),
      priority: 0.6,
      changeFrequency: "monthly" as const,
    })),
    ...posts.map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: new Date(post.date),
      priority: 0.5,
      changeFrequency: "monthly" as const,
    })),
    ...practiceQuestions.map((question) => ({
      path: `/practice/${question.id}`,
      lastModified: siteUpdated,
      priority: 0.7,
      changeFrequency: "monthly" as const,
    })),
  ];

  // One row per locale, each carrying the full hreflang set.
  return entries.flatMap((entry) =>
    locales.map((locale) => ({
      url: localeUrl(locale, entry.path),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: { languages: languageAlternates(entry.path) },
    })),
  );
}
