import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo-content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/callback", "/logout", "/zh/callback", "/zh/logout"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
