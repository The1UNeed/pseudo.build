import { siteUrl } from "@/lib/seo-content";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** BCP 47 tag used for <html lang>, hreflang, and structured data. */
export const localeTags: Record<Locale, string> = { en: "en", zh: "zh-CN" };

export const localeNames: Record<Locale, string> = { en: "English", zh: "中文" };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** English lives at the bare path; other locales are prefixed. `/` becomes `/zh`. */
export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function localeUrl(locale: Locale, path: string): string {
  const localized = localePath(locale, path);
  return localized === "/" ? siteUrl : `${siteUrl}${localized}`;
}

/** Rendered by src/app/opengraph-image.tsx; referenced explicitly because file-based
 *  metadata at the app root is not inherited by the [locale] segment. */
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
