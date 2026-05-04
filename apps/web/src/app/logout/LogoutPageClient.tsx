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
    <div className="rounded-lg border border-[#d7ddd0] bg-white p-6 text-center">
      <h1 className="text-2xl font-black text-[#151716]">Signing out</h1>
      <p className="mt-3 leading-7 text-[#4b5650]">
        You will be returned to the PseudoEditor homepage.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-[#151716] px-4 py-3 text-sm font-bold text-white"
      >
        Go home
      </Link>
    </div>
  );
}
