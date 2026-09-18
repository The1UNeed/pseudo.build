import { Footer } from "@/app/components/Footer";
import { resolveLocale, type LocaleParams } from "@/i18n/server";

export default async function PublicLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode }> & LocaleParams) {
  const locale = await resolveLocale(params);
  return (
    <div className="site">
      {children}
      <Footer locale={locale} />
    </div>
  );
}
