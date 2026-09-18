import { describe, expect, it } from "vitest";
import { docs, posts } from "@/lib/seo-content";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  it("lists every page once per locale", () => {
    expect(entries).toHaveLength((9 + docs.length + posts.length) * 2);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://pseudo.build");
    expect(urls).toContain("https://pseudo.build/zh");
    expect(urls).toContain(`https://pseudo.build/docs/${docs[0].slug}`);
    expect(urls).toContain(`https://pseudo.build/zh/blog/${posts[0].slug}`);
    expect(urls.some((url) => url.includes("/en/") || url.endsWith("/en"))).toBe(false);
  });

  it("gives both locale rows the same hreflang set", () => {
    const privacy = entries.filter((entry) => entry.url.endsWith("/privacy"));
    expect(privacy.map((entry) => entry.url)).toEqual(["https://pseudo.build/privacy", "https://pseudo.build/zh/privacy"]);
    for (const entry of privacy) {
      expect(entry.alternates?.languages).toEqual({
        en: "https://pseudo.build/privacy",
        "zh-CN": "https://pseudo.build/zh/privacy",
        "x-default": "https://pseudo.build/privacy",
      });
    }
  });
});
