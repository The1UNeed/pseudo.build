import Link from "next/link";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { productName } from "@/lib/seo-content";

/**
 * Rendered for notFound() anywhere under /[locale]. Next serves it in a bare error shell
 * without the root layout's stylesheet, so this page carries its own minimal styles.
 * not-found pages get no params, so the locale comes from the x-locale header the proxy sets.
 */
const styles = `
  body { margin: 0; font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; background: #f7f8f3; color: #151716; }
  .nf { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; text-align: center; }
  .nf-brand { font-weight: 800; font-size: 15px; letter-spacing: -0.01em; color: #151716; text-decoration: none; }
  .nf-eyebrow { margin: 40px 0 0; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #0b6e4f; }
  .nf h1 { margin: 16px 0 0; font-size: clamp(2rem, 6vw, 3.4rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }
  .nf p { margin: 20px 0 0; max-width: 32rem; font-size: 17px; line-height: 1.6; color: #4b5650; }
  .nf-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 32px; }
  .nf-btn { display: inline-flex; align-items: center; height: 44px; padding: 0 20px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; border: 1px solid #151716; color: #151716; }
  .nf-btn-accent { background: #0b6e4f; border-color: #0b6e4f; color: #fff; }
`;

export default async function NotFound() {
  const requested = (await headers()).get("x-locale") ?? defaultLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;
  const t = getDictionary(locale).notFound;

  return (
    <main className="nf" lang={locale === "zh" ? "zh-CN" : "en"}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <Link href={localePath(locale, "/")} className="nf-brand">
        {productName}
      </Link>
      <p className="nf-eyebrow">404</p>
      <h1>{t.title}</h1>
      <p>{t.body}</p>
      <div className="nf-actions">
        <Link href={localePath(locale, "/")} className="nf-btn nf-btn-accent">
          {t.home}
        </Link>
        <Link href={localePath(locale, "/app")} className="nf-btn">
          {t.editor}
        </Link>
      </div>
    </main>
  );
}
