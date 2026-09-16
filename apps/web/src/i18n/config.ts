import type { Metadata } from "next";
import { productName, siteUrl } from "@/lib/seo-content";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** BCP 47 tag used for <html lang>, hreflang, and structured data. */
export const localeTags: Record<Locale, string> = { en: "en", zh: "zh-CN" };

/** Open Graph `og:locale` values. */
export const ogLocales: Record<Locale, string> = { en: "en_US", zh: "zh_CN" };

export const localeNames: Record<Locale, string> = { en: "English", zh: "中文" };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** English lives at the bare path; other locales are prefixed. `/` becomes `/zh`. */
export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Inverse of localePath: `/zh/docs` becomes `/docs`. */
export function stripLocalePrefix(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  if (!isLocale(first) || first === defaultLocale) return pathname || "/";
  return `/${rest.join("/")}`;
}

export function localeUrl(locale: Locale, path: string): string {
  const localized = localePath(locale, path);
  return localized === "/" ? siteUrl : `${siteUrl}${localized}`;
}

/** Visible dates such as "4 May 2026" or "2026年5月4日". Input is an ISO date. */
export function formatDate(locale: Locale, isoDate: string): string {
  return new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "long", timeZone: "UTC" }).format(new Date(isoDate));
}

/** Rendered by src/app/opengraph-image/route.tsx and referenced explicitly by the metadata below. */
export const ogImage = { url: "/opengraph-image", width: 1200, height: 630 };

/** `alternates.languages` for Next metadata, plus x-default pointing at English. */
export function languageAlternates(path: string): Record<string, string> {
  const entries = locales.map((locale) => [localeTags[locale], localeUrl(locale, path)]);
  return Object.fromEntries([...entries, ["x-default", localeUrl(defaultLocale, path)]]);
}

export function localizedMetadata(locale: Locale, path: string) {
  return {
    canonical: localeUrl(locale, path),
    languages: languageAlternates(path),
  };
}

/** Social fields shared by every page. The locale layout sets these; pageMetadata repeats them because
 *  Next replaces a parent's `openGraph` and `twitter` objects rather than merging them. */
export function sharedSocialMetadata(locale: Locale, imageAlt: string) {
  return {
    openGraph: {
      type: "website",
      locale: ogLocales[locale],
      siteName: productName,
      images: [{ ...ogImage, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage.url],
    },
  } satisfies Metadata;
}

/**
 * Title, description, canonical, hreflang, Open Graph, and Twitter for one indexable page, so no page
 * inherits the home page's social title or URL. Titles get the product suffix unless they already start
 * with the product name.
 */
export function pageMetadata(locale: Locale, path: string, title: string, description: string, imageAlt: string) {
  const fullTitle = title.startsWith(productName) ? title : `${title} | ${productName}`;
  const shared = sharedSocialMetadata(locale, imageAlt);
  return {
    title: { absolute: fullTitle },
    description,
    alternates: localizedMetadata(locale, path),
    openGraph: { ...shared.openGraph, url: localeUrl(locale, path), title: fullTitle, description },
    twitter: { ...shared.twitter, title: fullTitle, description },
  } satisfies Metadata;
}
