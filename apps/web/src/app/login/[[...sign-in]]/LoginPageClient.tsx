"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function LoginPageClient() {
  if (!isCloudAuthConfigured()) {
    return (
      <div className="rounded-lg border border-[#d7ddd0] bg-white p-6">
        <h1 className="text-2xl font-black text-[#151716]">Login is not configured</h1>
        <p className="mt-3 leading-7 text-[#4b5650]">
          Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable browser account login.
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
