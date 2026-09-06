import type { MetadataRoute } from "next";
import { docs, posts, siteUrl } from "@/lib/seo-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/app", "/docs", "/blog", "/manual", "/terms", "/privacy", "/security"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-09-06"),
  }));

  const docRoutes = docs.map((doc) => ({
    url: `${siteUrl}/docs/${doc.slug}`,
    lastModified: new Date(doc.updated),
  }));

  const blogRoutes = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [...staticRoutes, ...docRoutes, ...blogRoutes];
}
