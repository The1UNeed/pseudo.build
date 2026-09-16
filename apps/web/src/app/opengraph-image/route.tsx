import { ImageResponse } from "next/og";
import { ogImage } from "@/i18n/config";

/**
 * The shared social image at /opengraph-image. A plain route handler rather than the opengraph-image
 * file convention: at the app root that convention also tags the root 404 and error shells, which have
 * no metadataBase (it lives in the [locale] layout) and so resolved the image URL against localhost.
 * Pages reference it through `ogImage` in i18n/config.ts.
 */
export const dynamic = "force-static";

const size = { width: ogImage.width, height: ogImage.height };

const code = [
  ["kw", "DECLARE"],
  ["id", " Total : "],
  ["ty", "INTEGER"],
] as const;

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0f1412 0%, #16211c 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#0b6e4f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {"<-"}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>Pseudo Build</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            Pseudocode that actually runs.
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.72)", maxWidth: 940 }}>
            Free online editor, compiler and runner for IGCSE, O Level and A Level Computer Science.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "22px 28px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 26,
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex" }}>
            {code.map(([kind, text]) => (
              <span key={text} style={{ color: kind === "kw" ? "#7fd1b5" : kind === "ty" ? "#9fc9ff" : "#fff" }}>
                {text}
              </span>
            ))}
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ color: "#7fd1b5" }}>FOR</span>
            <span> Number </span>
            <span style={{ color: "#7fd1b5" }}>{"<-"}</span>
            <span> 1 </span>
            <span style={{ color: "#7fd1b5" }}>TO</span>
            <span> 5 </span>
          </div>
          <div style={{ display: "flex", color: "#30d158" }}>{"> Total = 15"}</div>
        </div>
      </div>
    ),
    size,
  );
}
