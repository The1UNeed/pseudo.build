import type { MetadataRoute } from "next";
import { localePath, locales } from "@/i18n/config";
import { siteUrl } from "@/lib/seo-content";

const privatePaths = ["/callback", "/logout"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...locales.flatMap((locale) => privatePaths.map((path) => localePath(locale, path)))],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
