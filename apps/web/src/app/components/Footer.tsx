import Link from "next/link";
import { BrandMark } from "@/app/components/BrandMark";
import { authorName, githubUrl, productName, productSlogan } from "@/lib/seo-content";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/app", label: "Editor" },
      { href: "/docs", label: "Docs" },
      { href: "/manual", label: "Manual" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: githubUrl, label: "Source code", external: true },
      { href: `${githubUrl}/issues`, label: "Report an issue", external: true },
      { href: `${githubUrl}/blob/main/LICENSE`, label: "GPL-3.0 license", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "User agreement" },
      { href: "/privacy", label: "Privacy" },
      { href: "/security", label: "Security" },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5 text-white">
            <BrandMark size={28} />
            <span className="text-lg font-extrabold tracking-tight">{productName}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6">{productSlogan}</p>
          <p className="mt-2 text-sm leading-6">Build your pseudo code project freely and creatively.</p>
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
          &copy; {year} {authorName}. Released under the GNU GPL v3.
        </p>
        <p>Free and open source, forever.</p>
      </div>
    </footer>
  );
}
