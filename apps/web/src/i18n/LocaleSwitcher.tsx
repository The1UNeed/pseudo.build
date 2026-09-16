"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeNames, localePath, localeTags, locales, stripLocalePrefix } from "./config";
import { useLocale } from "./context";

/** Links to the current page in every other locale. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const bare = stripLocalePrefix(usePathname() ?? "/");

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
