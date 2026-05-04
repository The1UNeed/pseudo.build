import type { Metadata } from "next";
import ManualContent from "./ManualContent";

export const metadata: Metadata = {
  title: "Pseudocode Manual",
  description:
    "Read the PseudoEditor pseudocode manual with command words, loops, examples, arrays, and exam-style reference material.",
  alternates: {
    canonical: "/manual",
  },
};

export default function ManualPage() {
  return <ManualContent />;
}
