"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { localePath } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/context";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function LogoutPageClient() {
  if (!isCloudAuthConfigured()) {
    return <LogoutFallback />;
  }

  return <ConfiguredLogout />;
}

function ConfiguredLogout() {
  const clerk = useClerk();
  const locale = useLocale();

  useEffect(() => {
    void clerk.signOut({ redirectUrl: localePath(locale, "/") });
  }, [clerk, locale]);

  return <LogoutFallback />;
}

function LogoutFallback() {
  const locale = useLocale();
  const t = useDictionary().auth;

  return (
    <div className="site-card p-8 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">{t.signingOutTitle}</h1>
      <p className="mt-3 leading-7 text-[var(--ink-2)]">{t.signingOutBody}</p>
      <Link href={localePath(locale, "/")} className="site-btn mt-6">
        {t.goHome}
      </Link>
    </div>
  );
}
