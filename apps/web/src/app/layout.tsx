import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  authorName,
  homeSeoDescription,
  homeSeoTitle,
  organizationName,
  productName,
  seoKeywords,
  siteUrl,
} from "@/lib/seo-content";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: homeSeoTitle,
    template: `%s | ${productName}`,
  },
  description: homeSeoDescription,
  applicationName: productName,
  authors: [{ name: authorName }],
  creator: organizationName,
  publisher: organizationName,
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: productName,
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: [{ url: "/icon.png?v=3", width: 512, height: 512, alt: "Pseudo Build app icon" }],
  },
  twitter: {
    card: "summary",
    title: homeSeoTitle,
    description: homeSeoDescription,
    images: ["/icon.png?v=3"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/icon.png?v=3", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico?v=3" }],
    apple: [{ url: "/icon.png?v=3" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="antialiased">
        {children}
        {shouldRenderAnalytics ? <Analytics /> : null}
        {shouldRenderSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
