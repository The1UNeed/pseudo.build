import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { localeTags, locales, localeUrl, localizedMetadata, ogImage } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/context";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { authorName, organizationName, productName, siteUrl } from "@/lib/seo-content";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t.homeTitle,
      template: `%s | ${productName}`,
    },
    description: t.homeDescription,
    applicationName: productName,
    authors: [{ name: authorName }],
    creator: organizationName,
    publisher: organizationName,
    keywords: t.keywords,
    category: "education",
    alternates: localizedMetadata(locale, "/"),
    openGraph: {
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      url: localeUrl(locale, "/"),
      siteName: productName,
      title: t.homeTitle,
      description: t.homeDescription,
      images: [{ ...ogImage, alt: t.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.homeTitle,
      description: t.homeDescription,
      images: [ogImage.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode }> & LocaleParams) {
  const locale = await resolveLocale(params);
  const shouldRenderAnalytics = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const shouldRenderSpeedInsights = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const themeBootScript = `(() => {
    try {
      const stored = window.localStorage.getItem("igcse-theme-mode");
      const mode = stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
      const resolved = mode === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : mode;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    } catch {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();`;

  return (
    <html lang={localeTags[locale]} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        {shouldRenderAnalytics ? <Analytics /> : null}
        {shouldRenderSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
