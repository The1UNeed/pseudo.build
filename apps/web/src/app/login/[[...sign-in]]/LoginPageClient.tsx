"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function LoginPageClient() {
  if (!isCloudAuthConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-5">
        <div className="w-full max-w-md rounded-xl border border-[#d7ddd0] bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h1 className="text-2xl font-black text-[#151716]">Login is not configured</h1>
          <p className="mt-3 leading-7 text-[#4b5650]">
            Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable browser account login.
          </p>
          <Link
            href="/app"
            className="mt-6 inline-flex rounded-md bg-[#151716] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#1f2421] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:translate-y-[1px] active:scale-[0.98]"
          >
            Back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SignIn
      routing="path"
      path="/login"
      signUpUrl="/login"
      fallbackRedirectUrl="/app"
      forceRedirectUrl="/app"
    />
  );
}
