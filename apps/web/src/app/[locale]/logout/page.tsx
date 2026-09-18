import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import LogoutPageClient from "./LogoutPageClient";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return {
    title: getDictionary(locale).meta.logoutTitle,
    robots: { index: false, follow: false },
  };
}

export default function LogoutPage() {
  return (
    <ClerkProvider>
      <main className="site flex min-h-screen items-center justify-center px-5 py-12">
        <LogoutPageClient />
      </main>
    </ClerkProvider>
  );
}
