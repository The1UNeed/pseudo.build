import type { Metadata } from "next";
import ManualContent from "@/app/(public)/manual/ManualContent";

export const metadata: Metadata = {
  title: "Workspace Manual",
  description:
    "Use the Pseudo Build manual inside the editor for pseudocode syntax, control flow, tracing, and examples.",
  alternates: {
    canonical: "/app/manual",
  },
};

export default function AppManualPage() {
  return <ManualContent />;
}
