import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amém Chat",
    short_name: "Amém Chat",
    description:
      "Reflexões cristãs para situações reais, com inteligência artificial e limites honestos.",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f4ee",
    theme_color: "#6b2e3a",
    icons: [
      {
        src: "/pwa-icon?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
