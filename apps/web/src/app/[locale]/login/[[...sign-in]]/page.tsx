import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider } from "@/lib/auth-components";
import { BrandMark } from "@/app/components/BrandMark";
import { localePath, localizedMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { productName } from "@/lib/seo-content";
import LoginPageClient from "./LoginPageClient";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    title: t.loginTitle,
    description: t.loginDescription,
    alternates: localizedMetadata(locale, "/login"),
    robots: { index: false, follow: true },
  };
}

export default async function LoginPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).auth;

  return (
    <ClerkProvider>
      <main className="site flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <Link
          href={localePath(locale, "/")}
          className="mb-8 flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight"
        >
          <BrandMark size={28} />
          {productName}
        </Link>
        <LoginPageClient />
        <p className="mt-8 max-w-sm text-center text-xs leading-5 text-[var(--ink-3)]">
          {t.loginNote}{" "}
          <Link href={localePath(locale, "/terms")} className="underline">
            {t.loginTerms}
          </Link>{" "}
          {t.loginAnd}{" "}
          <Link href={localePath(locale, "/privacy")} className="underline">
            {t.loginPrivacy}
          </Link>
          {t.loginEnd}
        </p>
      </main>
    </ClerkProvider>
  );
}
