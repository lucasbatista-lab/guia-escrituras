import { ImageResponse } from "next/og";

export const runtime = "edge";

const ALLOWED_SIZES = new Set([180, 192, 512]);

export function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("size"));
  const size = ALLOWED_SIZES.has(requested) ? requested : 512;
  const inset = Math.round(size * 0.18);
  const pageWidth = Math.round(size * 0.3);
  const pageHeight = Math.round(size * 0.34);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "radial-gradient(circle at 50% 38%, #fffaf2 0%, #f5ede2 72%, #eadfce 100%)",
          borderRadius: Math.round(size * 0.18),
        }}
      >
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.22),
            width: Math.round(size * 0.045),
            height: Math.round(size * 0.045),
            borderRadius: "999px",
            background: "#c6a05a",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: Math.round(size * 0.025),
            marginTop: Math.round(size * 0.08),
            padding: inset,
          }}
        >
          <div
            style={{
              width: pageWidth,
              height: pageHeight,
              border: `${Math.max(5, Math.round(size * 0.025))}px solid #6b2e3a`,
              borderRadius: `${Math.round(size * 0.08)}px ${Math.round(size * 0.025)}px ${Math.round(size * 0.025)}px ${Math.round(size * 0.08)}px`,
              transform: "skewY(8deg)",
              background: "rgba(107,46,58,0.06)",
            }}
          />
          <div
            style={{
              width: pageWidth,
              height: pageHeight,
              border: `${Math.max(5, Math.round(size * 0.025))}px solid #6b2e3a`,
              borderRadius: `${Math.round(size * 0.025)}px ${Math.round(size * 0.08)}px ${Math.round(size * 0.08)}px ${Math.round(size * 0.025)}px`,
              transform: "skewY(-8deg)",
              background: "rgba(107,46,58,0.06)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
