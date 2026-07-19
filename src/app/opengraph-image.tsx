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
          background: "linear-gradient(145deg, #FBF8F3 0%, #F5EFE6 55%, #E8DCC8 100%)",
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
              background: "#6B2E3A",
              color: "#FBF8F3",
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
              color: "#2C241C",
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
              color: "#2C241C",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            Reflexões cristãs para situações reais
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#5C5046",
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
            borderTop: "1px solid rgba(44, 36, 28, 0.12)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 22, color: "#5C5046" }}>
            Inteligência artificial · baseada nas Escrituras
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#6B2E3A" }}>
            amemchat.com.br
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
