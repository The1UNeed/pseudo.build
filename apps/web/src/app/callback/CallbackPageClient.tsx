"use client";

import Link from "next/link";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function CallbackPageClient() {
  if (!isCloudAuthConfigured()) {
    return (
      <div className="rounded-lg border border-[#d7ddd0] bg-white p-6">
        <h1 className="text-2xl font-black text-[#151716]">Login callback is not configured</h1>
        <p className="mt-3 leading-7 text-[#4b5650]">
          Clerk environment variables are required before OAuth callbacks can complete.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex rounded-md bg-[#151716] px-4 py-3 text-sm font-bold text-white"
        >
          Back to app
        </Link>
      </div>
    );
  }

  return <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/app" />;
}
