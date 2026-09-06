"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { isCloudAuthConfigured } from "@/lib/auth-components";

export default function LoginPageClient() {
  if (!isCloudAuthConfigured()) {
    return (
      <div className="site-card w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Login is not configured</h1>
        <p className="mt-3 leading-7 text-[var(--ink-2)]">
          Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable account login.
        </p>
        <Link href="/app" className="site-btn mt-6">
          Back to editor
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
