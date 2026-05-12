import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";
import LoginPageClient from "./LoginPageClient";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to PseudoEditor to save browser workspaces with cloud sync.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <ClerkProvider>
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-5 py-12">
        <LoginPageClient />
      </main>
    </ClerkProvider>
  );
}
