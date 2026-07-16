/**
 * Copy plain text with Clipboard API, falling back to a temporary textarea.
 * Never throws internal details to callers — returns success boolean only.
 */
export async function copyTextToClipboard(
  text: string,
  deps?: {
    clipboardWriteText?: (value: string) => Promise<void>;
    execCommand?: (commandId: string) => boolean;
    document?: Pick<Document, "body" | "createElement">;
  },
): Promise<boolean> {
  const write =
    deps?.clipboardWriteText ??
    (typeof navigator !== "undefined" && navigator.clipboard?.writeText
      ? (value: string) => navigator.clipboard.writeText(value)
      : null);

  if (write) {
    try {
      await write(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }

  const doc = deps?.document ?? (typeof document !== "undefined" ? document : null);
  const exec =
    deps?.execCommand ??
    (typeof document !== "undefined"
      ? (id: string) => document.execCommand(id)
      : null);

  if (!doc || !exec) return false;

  try {
    const area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    doc.body.appendChild(area);
    area.select();
    const ok = exec("copy");
    doc.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
