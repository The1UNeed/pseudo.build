import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

const hasClerkServerConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);
const isElectronBuild = process.env.BUILD_TARGET === "electron";
const shouldUseClerkProxy = !isElectronBuild && hasClerkServerConfig;

// Paths that are not pages: API routes, Next internals, root metadata files, anything with an extension.
const passthrough = /^\/(api|_next|opengraph-image|twitter-image)(\/|$)|\.[a-z0-9]+$/i;

/**
 * English is served at the bare path (`/docs`) and rewritten to `/en/docs` internally.
 * Other locales keep their prefix (`/zh/docs`). `/en/...` redirects to the bare path so
 * every page has one canonical URL.
 */
function withLocaleHeader(request: NextRequest, locale: Locale) {
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  return { request: { headers } };
}

function localize(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (passthrough.test(pathname)) {
    return NextResponse.next();
  }

  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first)) {
    if (first !== defaultLocale) {
      return NextResponse.next(withLocaleHeader(request, first));
    }
    const url = request.nextUrl.clone();
    url.pathname = `/${rest.join("/")}`;
    return NextResponse.redirect(url, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url, withLocaleHeader(request, defaultLocale));
}

const clerkProxy = shouldUseClerkProxy ? clerkMiddleware((_auth, request) => localize(request)) : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkProxy) {
    return localize(request);
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
