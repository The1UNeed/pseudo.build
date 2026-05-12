import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#d7ddd0] bg-[#151716] px-5 py-12 text-[#a3ada7] md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="text-lg font-black text-white">PseudoEditor</p>
          <p className="mt-3 text-sm leading-6">
            Write, compile, run, and debug IGCSE-style pseudocode directly in your browser.
          </p>
        </div>

        <nav className="flex flex-wrap gap-8 md:gap-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white">Product</p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { href: "/app", label: "Editor" },
                { href: "/docs", label: "Docs" },
                { href: "/manual", label: "Manual" },
                { href: "/blog", label: "Blog" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-block transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-0.5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white">Resources</p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                {
                  href: "https://github.com/Lumora-Studio/PseudocodeCompiler",
                  label: "GitHub",
                },
                {
                  href: "https://github.com/Lumora-Studio/PseudocodeCompiler/issues",
                  label: "Feedback",
                },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-0.5 hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/8 pt-8 text-xs md:flex-row">
        <p>&copy; {year} PseudoEditor. All rights reserved.</p>
        <p>Built for students and teachers practicing IGCSE pseudocode.</p>
      </div>
    </footer>
  );
}
