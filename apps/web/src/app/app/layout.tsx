import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";

export const metadata: Metadata = {
  title: "Browser Pseudocode Compiler",
  description:
    "Open the full PseudoEditor browser app to write, compile, run, and debug pseudocode with workspace tools.",
  alternates: {
    canonical: "/app",
  },
};

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
