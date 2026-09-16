import type { Metadata } from "next";
import { LegalPage } from "@/app/components/LegalPage";
import { localizedMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { privacyEn } from "./content.en";
import { privacyZh } from "./content.zh";

const effectiveDate = "2026-09-12";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    title: t.privacyTitle,
    description: t.privacyDescription,
    alternates: localizedMetadata(locale, "/privacy"),
  };
}

export default async function PrivacyPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const content = locale === "zh" ? privacyZh : privacyEn;
  return <LegalPage locale={locale} effectiveDate={effectiveDate} {...content} />;
}
