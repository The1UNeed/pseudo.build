"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function LogoutPageClient() {
  if (!isCloudAuthConfigured()) {
    return <LogoutFallback />;
  }

  return <ConfiguredLogout />;
}

function ConfiguredLogout() {
  const clerk = useClerk();

  useEffect(() => {
    void clerk.signOut({ redirectUrl: "/" });
  }, [clerk]);

  return <LogoutFallback />;
}

function LogoutFallback() {
  return (
    <div className="site-card p-8 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Signing out</h1>
      <p className="mt-3 leading-7 text-[var(--ink-2)]">You will be returned to the Pseudo Build homepage.</p>
      <Link href="/" className="site-btn mt-6">
        Go home
      </Link>
    </div>
  );
}
