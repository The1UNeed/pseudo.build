import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/app/components/LegalPage";
import { pageMetadata, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { privacyEn } from "./content.en";
import { privacyZh } from "./content.zh";

const effectiveDate = "2026-09-15";
const content: Record<Locale, LegalContent> = { en: privacyEn, zh: privacyZh };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return pageMetadata(locale, "/privacy", t.privacyTitle, t.privacyDescription, t.ogImageAlt);
}

export default async function PrivacyPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return <LegalPage locale={locale} effectiveDate={effectiveDate} {...content[locale]} />;
}
