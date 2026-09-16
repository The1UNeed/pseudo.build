import { describe, expect, it } from "vitest";
import { languageAlternates, localePath, localeUrl } from "./config";

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
});
