import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { localeTags, locales, sharedSocialMetadata } from "@/i18n/config";
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
    // Only fields every page shares. Pages set their own title, canonical, and social title/URL
    // through pageMetadata, so none of them inherit the home page's values.
    ...sharedSocialMetadata(locale, t.ogImageAlt),
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
  // The privacy policy promises analytics on the production website only, not previews or local builds.
  const isProductionDeployment = process.env.VERCEL_ENV === "production";
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
        {isProductionDeployment ? <Analytics /> : null}
        {isProductionDeployment ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
