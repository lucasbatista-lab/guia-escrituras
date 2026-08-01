import { ProductHeroPreview } from "@/components/marketing/product-hero-preview";

const POSTER_SRC = "/marketing/comece-poster.svg";

/**
 * Video-ready media slot. Never blocks first paint with autoplay audio.
 * Swap the asset later via NEXT_PUBLIC_PAID_LANDING_VIDEO_URL only.
 */
export function PaidLandingMedia() {
  const videoUrl = process.env.NEXT_PUBLIC_PAID_LANDING_VIDEO_URL?.trim() || "";

  if (!videoUrl) {
    return (
      <div className="mx-auto w-full max-w-md">
        <ProductHeroPreview />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-ink/10 bg-ink/5 shadow-[0_24px_60px_-36px_rgba(44,36,28,0.55)]">
      <video
        className="aspect-video w-full bg-ink/90 object-cover"
        controls
        playsInline
        preload="metadata"
        poster={POSTER_SRC}
        controlsList="nodownload"
      >
        <source src={videoUrl} />
        Seu navegador não reproduz este vídeo. Use a prévia do produto abaixo.
      </video>
      <p className="px-3 py-2 text-center text-[11px] text-ink-soft">
        Demonstração do produto — sem áudio automático
      </p>
    </div>
  );
}
