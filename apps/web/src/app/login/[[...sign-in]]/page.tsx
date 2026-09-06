import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider } from "@/lib/auth-components";
import { BrandMark } from "@/app/components/BrandMark";
import { productName } from "@/lib/seo-content";
import LoginPageClient from "./LoginPageClient";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Pseudo Build to sync your workspaces across devices.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <ClerkProvider>
      <main className="site flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight">
          <BrandMark size={28} />
          {productName}
        </Link>
        <LoginPageClient />
        <p className="mt-8 max-w-sm text-center text-xs leading-5 text-[var(--ink-3)]">
          Signing in is optional. It only enables cloud sync. By continuing you agree to the{" "}
          <Link href="/terms" className="underline">user agreement</Link> and{" "}
          <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </main>
    </ClerkProvider>
  );
}
