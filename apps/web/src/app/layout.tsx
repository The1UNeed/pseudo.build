import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pseudoeditor.dev"),
  title: {
    default: "PseudoEditor - Browser Pseudocode Compiler",
    template: "%s | PseudoEditor",
  },
  description:
    "Write, compile, run, and debug IGCSE-style pseudocode in a full browser editor with docs, examples, flowcharts, and workspace saving.",
  applicationName: "PseudoEditor",
  keywords: [
    "pseudocode compiler",
    "browser pseudocode editor",
    "IGCSE pseudocode",
    "pseudocode runner",
    "Cambridge pseudocode",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://pseudoeditor.dev",
    siteName: "PseudoEditor",
    title: "PseudoEditor - Browser Pseudocode Compiler",
    description:
      "A full browser version of Pseudocode Compiler with docs, examples, flowcharts, and cloud workspace saving.",
    images: [{ url: "/icon.png?v=2", width: 512, height: 512, alt: "PseudoEditor app icon" }],
  },
  twitter: {
    card: "summary",
    title: "PseudoEditor - Browser Pseudocode Compiler",
    description:
      "Write, compile, run, and debug IGCSE-style pseudocode directly in the browser.",
    images: ["/icon.png?v=2"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2" },
      { url: "/icon.png?v=2", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico?v=2" }],
    apple: [{ url: "/icon.png?v=2" }],
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
