"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { localePath } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/context";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function LoginPageClient() {
  const locale = useLocale();
  const t = useDictionary().auth;

  if (!isCloudAuthConfigured()) {
    return (
      <div className="site-card w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{t.loginNotConfiguredTitle}</h1>
        <p className="mt-3 leading-7 text-[var(--ink-2)]">{t.loginNotConfiguredBody}</p>
        <Link href={localePath(locale, "/app")} className="site-btn mt-6">
          {t.backToEditor}
        </Link>
      </div>
    );
  }

  return (
    <SignIn
      routing="path"
      path={localePath(locale, "/login")}
      signUpUrl={localePath(locale, "/login")}
      fallbackRedirectUrl={localePath(locale, "/app")}
      forceRedirectUrl={localePath(locale, "/app")}
    />
  );
}
