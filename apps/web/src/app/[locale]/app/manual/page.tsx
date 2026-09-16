import type { Metadata } from "next";
import ManualContent from "@/app/[locale]/(public)/manual/ManualContent";
import { localizedMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    title: t.appManualTitle,
    description: t.appManualDescription,
    alternates: localizedMetadata(locale, "/app/manual"),
  };
}

export default function AppManualPage() {
  return <ManualContent />;
}
