import {
  ContinuityMarker,
  GuideBubble,
  NextStepBlock,
  ProductFrame,
  ProductFrameHeader,
  ProductFrameNav,
  ScriptureChip,
  UserBubble,
} from "@/components/marketing/paid-landing/conversation-language";
import { cn } from "@/lib/utils";

const POSTER_SRC = "/marketing/comece-poster.svg";

/**
 * Large-scale product surface for the V2 campaign hero.
 * Reuses the faithful illustrative thread — not a generic phone mockup.
 */
export function PaidLandingV2ProductSurface({
  className,
}: {
  className?: string;
}) {
  return (
    <ProductFrame
      className={cn("max-w-none", className)}
      caption="Prévia do produto · exemplo ilustrativo"
    >
      <ProductFrameHeader status="Organizando o que está em jogo" />
      <div className="space-y-2.5 px-3.5 py-3 font-chat text-[13px] leading-snug sm:space-y-3 sm:px-4 sm:py-3.5 sm:text-[13.5px]">
        <UserBubble className="max-w-[88%] px-3 py-2 text-[13px] sm:text-[13.5px]">
          Quero perdoar, mas não sei se isso significa voltar a conviver.
        </UserBubble>
        <GuideBubble className="max-w-[94%] px-3 py-2.5 text-[13px] sm:text-[13.5px]">
          <p>
            O que precisa ser protegido antes de pensar em uma aproximação?
          </p>
          <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
            Perdão e convivência não são necessariamente a mesma decisão.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ScriptureChip withIcon>Efésios 4:31–32</ScriptureChip>
            <ScriptureChip>Colossenses 3:13</ScriptureChip>
          </div>
          <NextStepBlock title="Próximo passo" className="mt-2.5 text-[11.5px]">
            <p>Defina o limite que precisaria ser respeitado.</p>
          </NextStepBlock>
        </GuideBubble>
        <ContinuityMarker className="px-2.5 py-1 text-[10.5px]">
          Continua no Histórico quando voltar
        </ContinuityMarker>
      </div>
      <ProductFrameNav />
    </ProductFrame>
  );
}

/**
 * Video-ready media for V2. Without NEXT_PUBLIC_PAID_LANDING_VIDEO_URL,
 * shows a large static product composition — never a dead play button.
 *
 * When a URL is set, the frame is reserved (9:16) and the video uses
 * object-contain so 9:16 or 4:5 sources stay fully visible (no cover crop).
 */
export function PaidLandingV2Media({
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
        <PaidLandingV2ProductSurface />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative mx-auto w-full overflow-hidden rounded-[1.85rem] border border-ink/15 bg-ink/90 shadow-[0_28px_70px_-36px_rgba(44,36,28,0.6)] sm:rounded-[2.1rem]">
        <div className="relative mx-auto aspect-[9/16] w-full max-h-[min(70vh,36rem)] bg-ink/90 sm:max-h-[min(75vh,42rem)]">
          <video
            className="absolute inset-0 h-full w-full object-contain"
            controls
            playsInline
            preload="metadata"
            poster={POSTER_SRC}
            controlsList="nodownload"
            data-priority={priority ? "true" : undefined}
          >
            <source src={videoUrl} type="video/mp4" />
            Seu navegador não reproduz este vídeo.
          </video>
        </div>
        <p className="px-3 py-2 text-center text-[11px] text-sand-50/75">
          Demonstração do produto — toque para reproduzir · sem áudio automático
        </p>
      </div>
    </div>
  );
}
