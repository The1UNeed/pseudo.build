import { describe, expect, it } from "vitest";
import { formatDate, languageAlternates, localePath, localeUrl, pageMetadata, stripLocalePrefix } from "./config";

describe("locale paths", () => {
  it("leaves English unprefixed and prefixes Chinese", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("en", "/docs/syntax")).toBe("/docs/syntax");
    expect(localePath("zh", "/")).toBe("/zh");
    expect(localePath("zh", "/docs/syntax")).toBe("/zh/docs/syntax");
  });

  it("builds absolute URLs without a trailing slash on the root", () => {
    expect(localeUrl("en", "/")).toBe("https://pseudo.build");
    expect(localeUrl("zh", "/")).toBe("https://pseudo.build/zh");
    expect(localeUrl("zh", "/app")).toBe("https://pseudo.build/zh/app");
  });

  it("emits hreflang alternates with x-default pointing at English", () => {
    expect(languageAlternates("/manual")).toEqual({
      en: "https://pseudo.build/manual",
      "zh-CN": "https://pseudo.build/zh/manual",
      "x-default": "https://pseudo.build/manual",
    });
  });

  it("strips the locale prefix", () => {
    expect(stripLocalePrefix("/zh")).toBe("/");
    expect(stripLocalePrefix("/zh/docs/syntax")).toBe("/docs/syntax");
    expect(stripLocalePrefix("/docs")).toBe("/docs");
    expect(stripLocalePrefix("/zhx")).toBe("/zhx");
  });

  it("formats dates for the locale", () => {
    expect(formatDate("en", "2026-05-04")).toBe("May 4, 2026");
    expect(formatDate("zh", "2026-05-04")).toBe("2026年5月4日");
  });
});

describe("pageMetadata", () => {
  it("sets title, canonical, and social fields for the page itself", () => {
    expect(pageMetadata("zh", "/docs", "文档", "描述", "图片")).toEqual({
      title: { absolute: "文档 | Pseudo Build" },
      description: "描述",
      alternates: {
        canonical: "https://pseudo.build/zh/docs",
        languages: {
          en: "https://pseudo.build/docs",
          "zh-CN": "https://pseudo.build/zh/docs",
          "x-default": "https://pseudo.build/docs",
        },
      },
      openGraph: {
        type: "website",
        locale: "zh_CN",
        siteName: "Pseudo Build",
        images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "图片" }],
        url: "https://pseudo.build/zh/docs",
        title: "文档 | Pseudo Build",
        description: "描述",
      },
      twitter: {
        card: "summary_large_image",
        images: ["/opengraph-image"],
        title: "文档 | Pseudo Build",
        description: "描述",
      },
    });
  });

  it("does not repeat the product name in a title that already has it", () => {
    const home = pageMetadata("en", "/", "Pseudo Build - Editor", "d", "alt");
    expect(home.title).toEqual({ absolute: "Pseudo Build - Editor" });
    expect(home.openGraph.url).toBe("https://pseudo.build");
  });
});
