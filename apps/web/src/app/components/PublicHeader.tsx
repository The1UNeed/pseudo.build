import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type PublicHeaderProps = {
  active?: "docs" | "blog" | "manual";
};

const navItems = [
  { href: "/docs", label: "Docs", key: "docs" },
  { href: "/blog", label: "Blog", key: "blog" },
  { href: "/manual", label: "Manual", key: "manual" },
] as const;

export function PublicHeader({ active }: PublicHeaderProps) {
  return (
    <header className="relative z-20 border-b border-white/8 bg-[#0f1615] text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]">
      <div className="absolute inset-0 bg-[linear-gradient(100deg,#101315_0%,#103c31_56%,#0b6e4f_100%)] opacity-95" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 font-bold transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02]"
        >
          <Image
            src="/branding/app-icon-128.png"
            alt=""
            width={36}
            height={36}
            className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[-4deg]"
          />
          <span className="transition-colors duration-200">PseudoEditor</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-semibold text-white/76 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-link relative py-1 transition-colors duration-250 ${
                active === item.key
                  ? "text-white"
                  : "hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          href="/app"
          className="cta-primary inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#151716] hover:bg-[#dce8d1]"
        >
          Open app <ArrowRight size={16} className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </header>
  );
}
