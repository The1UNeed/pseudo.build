import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";
import { localizedMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    title: t.editorTitle,
    description: t.editorDescription,
    alternates: localizedMetadata(locale, "/app"),
  };
}

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
