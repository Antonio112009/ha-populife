/**
 * Copy text. The Clipboard API only exists on secure pages (many Home Assistant installs are
 * opened over plain http on the local network) and some webviews refuse it, so fall back to a
 * hidden, selected textarea. `host` is where that textarea goes: inside an open modal dialog,
 * the rest of the page is inert.
 */
export async function copyText(text: string, host: Node = document.body): Promise<void> {
  if (window.isSecureContext && "clipboard" in navigator) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Refused here; try the old way.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  host.appendChild(area);
  area.select();
  try {
    // The only way to copy without the Clipboard API.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (!document.execCommand("copy")) throw new Error("Copying is not allowed here");
  } finally {
    area.remove();
  }
}
