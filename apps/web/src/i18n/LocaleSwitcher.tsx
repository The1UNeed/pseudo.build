"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeNames, localePath, localeTags, locales } from "./config";
import { useLocale } from "./context";

/** Links to the current page in every other locale. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const bare = pathname.replace(/^\/(zh)(?=\/|$)/, "") || "/";

  return (
    <>
      {locales
        .filter((other) => other !== locale)
        .map((other) => (
          <Link
            key={other}
            href={localePath(other, bare)}
            hrefLang={localeTags[other]}
            lang={localeTags[other]}
            className={className}
          >
            {localeNames[other]}
          </Link>
        ))}
    </>
  );
}
