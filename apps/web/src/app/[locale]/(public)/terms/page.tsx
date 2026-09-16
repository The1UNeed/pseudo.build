import type { Metadata } from "next";
import { LegalPage } from "@/app/components/LegalPage";
import { localizedMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { termsEn } from "./content.en";
import { termsZh } from "./content.zh";

const effectiveDate = "2026-09-12";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    title: t.termsTitle,
    description: t.termsDescription,
    alternates: localizedMetadata(locale, "/terms"),
  };
}

export default async function TermsPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const content = locale === "zh" ? termsZh : termsEn;
  return <LegalPage locale={locale} effectiveDate={effectiveDate} {...content} />;
}
