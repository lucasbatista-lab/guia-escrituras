"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { PaidLandingProductPoster } from "@/components/marketing/paid-landing/conversation-language";
import { cn } from "@/lib/utils";

const POSTER_SRC = "/marketing/comece-poster.svg";

/**
 * Native video with a readable product cover until the visitor chooses to play.
 * Native SVG `poster` alone often paints as a dark frame in Chromium; the cover
 * reuses the existing product poster plus an explicit play control.
 */
export function PaidLandingV2Video({
  videoUrl,
  priority = false,
  className,
}: {
  videoUrl: string;
  priority?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function startPlayback() {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    void video.play().catch(() => {
      /* User can still use native controls once revealed. */
    });
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-[1.85rem] border border-ink/15 bg-sand-100 shadow-[0_28px_70px_-36px_rgba(44,36,28,0.6)] sm:rounded-[2.1rem]",
        className,
      )}
    >
      <div className="relative mx-auto aspect-[9/16] w-full max-h-[min(70vh,36rem)] bg-sand-100 sm:max-h-[min(75vh,42rem)]">
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 z-0 h-full w-full object-contain",
            !started && "pointer-events-none opacity-0",
          )}
          controls={started}
          playsInline
          preload="metadata"
          poster={POSTER_SRC}
          controlsList="nodownload"
          data-priority={priority ? "true" : undefined}
          onPlay={() => setStarted(true)}
        >
          <source src={videoUrl} type="video/mp4" />
          Seu navegador não reproduz este vídeo.
        </video>

        {!started ? (
          <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-sand-100">
            <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden px-2.5 pb-2 pt-2.5 sm:px-3 sm:pt-3">
              <PaidLandingProductPoster className="max-w-none w-full [&_figure]:max-w-none" />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent"
            />
            <button
              type="button"
              onClick={startPlayback}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40"
              aria-label="Reproduzir demonstração do produto"
            >
              <span className="inline-flex size-16 items-center justify-center rounded-full border border-sand-50/40 bg-ink/75 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur-sm transition hover:bg-ink/85 sm:size-[4.5rem]">
                <Play
                  aria-hidden
                  className="ml-1 size-7 fill-current sm:size-8"
                />
              </span>
              <span className="rounded-md bg-ink/70 px-3 py-1.5 text-sm font-medium tracking-wide backdrop-blur-sm">
                Toque para reproduzir
              </span>
            </button>
          </div>
        ) : null}
      </div>
      <p className="bg-ink/90 px-3 py-2 text-center text-[11px] text-sand-50/75">
        Demonstração do produto — toque para reproduzir · sem áudio automático
      </p>
    </div>
  );
}
