import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import CallbackPageClient from "./CallbackPageClient";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return {
    title: getDictionary(locale).meta.callbackTitle,
    robots: { index: false, follow: false },
  };
}

export default function CallbackPage() {
  return (
    <ClerkProvider>
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-5 py-12">
        <CallbackPageClient />
      </main>
    </ClerkProvider>
  );
}
