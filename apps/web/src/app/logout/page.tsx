import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";
import LogoutPageClient from "./LogoutPageClient";

export const metadata: Metadata = {
  title: "Log out",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LogoutPage() {
  return (
    <ClerkProvider>
      <main className="site flex min-h-screen items-center justify-center px-5 py-12">
        <LogoutPageClient />
      </main>
    </ClerkProvider>
  );
}
