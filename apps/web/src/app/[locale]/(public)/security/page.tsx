import type { Metadata } from "next";
import { LegalPage } from "@/app/components/LegalPage";
import { localizedMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { securityEn } from "./content.en";
import { securityZh } from "./content.zh";

const effectiveDate = "2026-09-12";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    title: t.securityTitle,
    description: t.securityDescription,
    alternates: localizedMetadata(locale, "/security"),
  };
}

export default async function SecurityPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const content = locale === "zh" ? securityZh : securityEn;
  return <LegalPage locale={locale} effectiveDate={effectiveDate} {...content} />;
}
