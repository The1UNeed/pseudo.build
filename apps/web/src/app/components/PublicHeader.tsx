import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/app/components/BrandMark";
import { githubUrl, productName } from "@/lib/seo-content";

export type PublicNavKey = "docs" | "blog" | "manual" | "legal";

type PublicHeaderProps = {
  active?: PublicNavKey;
};

const navItems = [
  { href: "/docs", label: "Docs", key: "docs" },
  { href: "/manual", label: "Manual", key: "manual" },
  { href: "/blog", label: "Blog", key: "blog" },
] as const;

export function PublicHeader({ active }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b-[1.5px] border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur-md">
      <nav className="site-wrap flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight">
          <BrandMark size={28} />
          {productName}
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
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
            GitHub <ArrowUpRight size={14} />
          </a>
        </div>

        <Link href="/app" className="site-btn h-10 px-4 text-[13px]">
          Open editor
        </Link>
      </nav>
    </header>
  );
}
