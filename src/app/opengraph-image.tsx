import { ImageResponse } from "next/og";

export const alt = "Amém Chat — reflexões cristãs para situações reais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Static social preview (1200×630). No remote fonts, no user data, no Jesus imagery.
 * Colors aligned with the marketing palette (sand / wine / ink).
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(155deg, #3A1520 0%, #5A2232 42%, #6B3A4A 78%, #7A4A52 100%)",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "linear-gradient(90deg, #D4C09A, #B8965A)",
              color: "#3A1520",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "#FFFDFC",
              letterSpacing: "-0.02em",
            }}
          >
            Amém Chat
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 700,
              color: "#FFFDFC",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            Reflexões cristãs para situações reais
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,253,252,0.72)",
              lineHeight: 1.35,
              maxWidth: 780,
            }}
          >
            Acolhimento, responsabilidade e esperança.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 253, 252, 0.14)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 22, color: "rgba(255,253,252,0.72)" }}>
            Inteligência artificial · baseada nas Escrituras
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#D4C09A" }}>
            amemchat.com.br
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
