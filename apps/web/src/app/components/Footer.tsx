import Link from "next/link";
import { BrandMark } from "@/app/components/BrandMark";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { LocaleSwitcher } from "@/i18n/LocaleSwitcher";
import { authorName, githubUrl, productName } from "@/lib/seo-content";

export function Footer({ locale }: { locale: Locale }) {
  const year = new Date().getFullYear();
  const t = getDictionary(locale).footer;
  const columns = [
    {
      title: t.product,
      links: [
        { href: localePath(locale, "/app"), label: t.editor },
        { href: localePath(locale, "/docs"), label: getDictionary(locale).nav.docs },
        { href: localePath(locale, "/manual"), label: getDictionary(locale).nav.manual },
        { href: localePath(locale, "/blog"), label: getDictionary(locale).nav.blog },
      ],
    },
    {
      title: t.project,
      links: [
        { href: githubUrl, label: t.sourceCode, external: true },
        { href: `${githubUrl}/issues`, label: t.reportIssue, external: true },
        { href: `${githubUrl}/blob/main/LICENSE`, label: t.license, external: true },
      ],
    },
    {
      title: t.legal,
      links: [
        { href: localePath(locale, "/terms"), label: t.terms },
        { href: localePath(locale, "/privacy"), label: t.privacy },
        { href: localePath(locale, "/security"), label: t.security },
      ],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="site-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5 text-white">
            <BrandMark size={28} />
            <span className="text-lg font-extrabold tracking-tight">{productName}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6">{t.slogan}</p>
          <p className="mt-2 text-sm leading-6">{t.slogan2}</p>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-white">{t.language}</p>
          <p className="mt-2 text-sm">
            <LocaleSwitcher />
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white">{column.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) =>
                "external" in link ? (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="site-wrap flex flex-col gap-2 border-t border-white/10 py-6 text-xs md:flex-row md:items-center md:justify-between">
        <p>
          &copy; {year} {authorName}. {t.copyright}
        </p>
        <p>{t.freeForever}</p>
      </div>
    </footer>
  );
}
