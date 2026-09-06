import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/auth-components";

export const metadata: Metadata = {
  title: "Editor",
  description:
    "Open the Pseudo Build editor to write, compile, run, and debug pseudocode with multi-file workspaces.",
  alternates: {
    canonical: "/app",
  },
};

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
