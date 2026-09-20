/**
 * Standalone V17 presence share card rasterizer.
 * Draws directly to canvas — never captures app chrome (header/nav).
 */

export type PresenceShareCardPayload = {
  eyebrow: string;
  quote: string;
  reference?: string;
  brandWord?: string;
};

export type PresenceShareFormat = "story" | "square";

const FORMATS: Record<
  PresenceShareFormat,
  { width: number; height: number }
> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function fillDusk(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#5C1F2E");
  g.addColorStop(0.55, "#4A2438");
  g.addColorStop(1, "#2A1824");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawBrassMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  width: number,
  height: number,
) {
  const g = ctx.createLinearGradient(cx - width / 2, y, cx + width / 2, y);
  g.addColorStop(0, "#D4C09A");
  g.addColorStop(1, "#B8965A");
  const x = cx - width / 2;
  const r = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
}

/** Render a standalone dusk share card to a canvas (no app shell). */
export function renderPresenceShareCard(
  payload: PresenceShareCardPayload,
  format: PresenceShareFormat = "story",
): HTMLCanvasElement {
  const { width, height } = FORMATS[format];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  fillDusk(ctx, width, height);

  const cx = width / 2;
  const pad = Math.round(width * 0.1);
  const contentW = width - pad * 2;

  // Vertical rhythm centered like V17 card
  const blockTop = format === "story" ? height * 0.28 : height * 0.22;

  drawBrassMark(ctx, cx, blockTop, 72, 8);

  ctx.fillStyle = "rgba(212,188,140,0.92)";
  ctx.font = `700 ${Math.round(width * 0.028)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const eyeY = blockTop + 48;
  ctx.fillText(payload.eyebrow.toUpperCase(), cx, eyeY);

  ctx.fillStyle = "#FFFDFC";
  const quoteSize = Math.round(width * 0.055);
  ctx.font = `italic 600 ${quoteSize}px Georgia, "Times New Roman", serif`;
  const quoteLines = wrapText(ctx, payload.quote, contentW);
  const quoteLineH = quoteSize * 1.25;
  let quoteY = eyeY + Math.round(width * 0.055);
  for (const line of quoteLines) {
    ctx.fillText(line, cx, quoteY);
    quoteY += quoteLineH;
  }

  let y = quoteY + Math.round(width * 0.04);
  if (payload.reference) {
    ctx.fillStyle = "rgba(255,253,252,0.72)";
    ctx.font = `400 ${Math.round(width * 0.032)}px Inter, system-ui, sans-serif`;
    ctx.fillText(payload.reference, cx, y);
    y += Math.round(width * 0.08);
  } else {
    y += Math.round(width * 0.06);
  }

  ctx.fillStyle = "#FFFDFC";
  ctx.font = `700 ${Math.round(width * 0.048)}px Inter, system-ui, sans-serif`;
  ctx.fillText(payload.brandWord ?? "Amém", cx, Math.min(y + 24, height * 0.82));

  return canvas;
}

export async function presenceShareCardToBlob(
  payload: PresenceShareCardPayload,
  format: PresenceShareFormat = "story",
  type: string = "image/png",
): Promise<Blob> {
  const canvas = renderPresenceShareCard(payload, format);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type),
  );
  if (!blob) throw new Error("Failed to encode share card");
  return blob;
}

export async function downloadPresenceShareCard(
  payload: PresenceShareCardPayload,
  format: PresenceShareFormat = "story",
  filename = `amem-presenca-${format}.png`,
): Promise<void> {
  const blob = await presenceShareCardToBlob(payload, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function sharePresenceShareCard(input: {
  payload: PresenceShareCardPayload;
  format?: PresenceShareFormat;
  shareUrl?: string;
  title?: string;
  text?: string;
}): Promise<"shared" | "downloaded" | "cancelled"> {
  const format = input.format ?? "story";
  const blob = await presenceShareCardToBlob(input.payload, format);
  const file = new File([blob], `amem-presenca-${format}.png`, {
    type: "image/png",
  });

  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const data: ShareData = {
    title: input.title ?? "Amém",
    text: input.text,
    url: input.shareUrl,
  };

  try {
    if (nav && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: data.title, text: data.text });
      return "shared";
    }
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "NotAllowedError")
    ) {
      return "cancelled";
    }
    // fall through to download
  }

  await downloadPresenceShareCard(input.payload, format);
  return "downloaded";
}
