import type { MetadataRoute } from "next";
import { en } from "@/i18n/messages/en";
import { productName } from "@/lib/seo-content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: productName,
    short_name: productName,
    description: en.meta.homeDescription,
    start_url: "/app",
    display: "standalone",
    background_color: "#1c1c1e",
    theme_color: "#0b6e4f",
    lang: "en",
    categories: ["education", "developer tools"],
    icons: [
      { src: "/branding/app-icon-128.png", sizes: "128x128", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
