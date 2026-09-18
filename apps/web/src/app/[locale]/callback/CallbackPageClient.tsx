"use client";

import Link from "next/link";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { localePath } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/context";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function CallbackPageClient() {
  const locale = useLocale();
  const t = useDictionary().auth;

  if (!isCloudAuthConfigured()) {
    return (
      <div className="rounded-lg border border-[#d7ddd0] bg-white p-6">
        <h1 className="text-2xl font-black text-[#151716]">{t.callbackNotConfiguredTitle}</h1>
        <p className="mt-3 leading-7 text-[#4b5650]">{t.callbackNotConfiguredBody}</p>
        <Link
          href={localePath(locale, "/app")}
          className="mt-6 inline-flex rounded-md bg-[#151716] px-4 py-3 text-sm font-bold text-white"
        >
          {t.backToApp}
        </Link>
      </div>
    );
  }

  return <AuthenticateWithRedirectCallback signInFallbackRedirectUrl={localePath(locale, "/app")} />;
}
