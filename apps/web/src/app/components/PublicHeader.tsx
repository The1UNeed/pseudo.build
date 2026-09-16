import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/app/components/BrandMark";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { LocaleSwitcher } from "@/i18n/LocaleSwitcher";
import { githubUrl, productName } from "@/lib/seo-content";

export type PublicNavKey = "docs" | "blog" | "manual" | "legal";

type PublicHeaderProps = {
  locale: Locale;
  active?: PublicNavKey;
};

export function PublicHeader({ locale, active }: PublicHeaderProps) {
  const t = getDictionary(locale).nav;
  const navItems = [
    { href: "/docs", label: t.docs, key: "docs" },
    { href: "/manual", label: t.manual, key: "manual" },
    { href: "/blog", label: t.blog, key: "blog" },
  ] as const;

  return (
    <header className="site-header">
      <nav className="site-wrap flex h-16 items-center justify-between gap-6">
        <Link
          href={localePath(locale, "/")}
          className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight text-white"
        >
          <BrandMark size={28} />
          {productName}
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={localePath(locale, item.href)}
              className="site-nav-link"
              aria-current={active === item.key ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="site-nav-link inline-flex items-center gap-1"
          >
            {t.github} <ArrowUpRight size={14} />
          </a>
          <LocaleSwitcher className="site-nav-link" />
        </div>

        <Link href={localePath(locale, "/app")} className="site-btn h-10 px-4 text-[13px]">
          {t.openEditor}
        </Link>
      </nav>
    </header>
  );
}
