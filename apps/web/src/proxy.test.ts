import { describe, expect, it } from "vitest";
import { NextRequest, type NextFetchEvent, type NextResponse } from "next/server";
import { getRedirectUrl, getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import proxy from "./proxy";

async function run(path: string) {
  const response = await proxy(new NextRequest(`https://pseudo.build${path}`), {} as NextFetchEvent);
  if (!response) throw new Error(`no response for ${path}`);
  return response as NextResponse;
}

describe("proxy locale routing", () => {
  it("rewrites bare paths to English", async () => {
    const response = await run("/docs");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://pseudo.build/en/docs");
  });

  it("redirects /en paths to the bare path", async () => {
    const response = await run("/en/docs");
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe("https://pseudo.build/docs");
  });

  it("leaves Chinese paths in place and tags the locale", async () => {
    const response = await run("/zh/docs");
    expect(isRewrite(response)).toBe(false);
    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get("x-middleware-request-x-locale")).toBe("zh");
  });

  it("localizes page slugs that contain a dot", async () => {
    expect(getRewrittenUrl(await run("/docs/v1.2"))).toBe("https://pseudo.build/en/docs/v1.2");
  });

  it.each(["/robots.txt", "/sitemap.xml", "/.well-known/security.txt", "/api/workspace", "/opengraph-image"])(
    "passes %s through",
    async (path) => {
      const response = await run(path);
      expect(isRewrite(response)).toBe(false);
      expect(getRedirectUrl(response)).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );
});
