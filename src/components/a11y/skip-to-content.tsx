import { MAIN_CONTENT_ID } from "@/components/a11y/main-content-id";

/**
 * First focusable control for keyboard users. Visually hidden until focused.
 */
export function SkipToContent() {
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className="skip-to-content">
      Pular para o conteúdo
    </a>
  );
}
