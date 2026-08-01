import { PaidLandingProductPoster } from "./conversation-language";

const POSTER_SRC = "/marketing/comece-poster.svg";

/**
 * Video-ready media slot for the paid landing.
 * Without NEXT_PUBLIC_PAID_LANDING_VIDEO_URL, shows a faithful product poster.
 * Never autoplays with audio; never blocks first paint with a full download.
 */
export function PaidLandingMedia({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  const videoUrl = process.env.NEXT_PUBLIC_PAID_LANDING_VIDEO_URL?.trim() || "";

  if (!videoUrl) {
    return (
      <div className={className}>
        <PaidLandingProductPoster />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.85rem] border border-ink/15 bg-ink/90 shadow-[0_24px_60px_-36px_rgba(44,36,28,0.55)] sm:max-w-xl sm:rounded-[2rem]">
        <div className="relative aspect-[9/16] w-full max-h-[min(68vh,34rem)] bg-ink/90 sm:aspect-video sm:max-h-none">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
            poster={POSTER_SRC}
            controlsList="nodownload"
            data-priority={priority ? "true" : undefined}
          >
            <source src={videoUrl} />
            Seu navegador não reproduz este vídeo. A prévia do produto permanece
            disponível abaixo.
          </video>
        </div>
        <p className="px-3 py-2 text-center text-[11px] text-sand-50/75">
          Demonstração do produto — toque para reproduzir · sem áudio automático
        </p>
      </div>
      <p className="mt-2 text-center text-[10px] tracking-wide text-ink-soft">
        Exemplo ilustrativo fiel à experiência do produto
      </p>
    </div>
  );
}
