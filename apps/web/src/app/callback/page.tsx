import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";
import CallbackPageClient from "./CallbackPageClient";

export const metadata: Metadata = {
  title: "Finishing login",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CallbackPage() {
  return (
    <ClerkProvider>
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-5 py-12">
        <CallbackPageClient />
      </main>
    </ClerkProvider>
  );
}
