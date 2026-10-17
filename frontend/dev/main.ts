/** Dev harness: mounts the panel against the mocked Home Assistant. */

import { toLocalInput } from "../src/logic";
import "../src/populife-panel";
import type { PopulifePanel } from "../src/populife-panel";
import { createMockHass } from "./mock-hass";

// A tiny <ha-icon> stand-in. Like Home Assistant's, it renders into its own shadow root and
// never touches its light DOM, which Lit owns.
const MDI_CSS = "https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css";
customElements.define(
  "ha-icon",
  class extends HTMLElement {
    static observedAttributes = ["icon"];
    private readonly root = this.attachShadow({ mode: "open" });
    attributeChangedCallback() {
      const name = (this.getAttribute("icon") ?? "").replace("mdi:", "");
      this.root.innerHTML =
        `<link rel="stylesheet" href="${MDI_CSS}">` +
        `<style>:host{display:inline-flex;line-height:1}</style>` +
        `<i class="mdi mdi-${name}" style="font-size:var(--mdc-icon-size,24px)"></i>`;
    }
  },
);

const params = new URLSearchParams(location.search);
const flag = (name: string) => params.has(name);
for (const name of ["dark", "ru", "narrow", "denied"]) {
  const box = document.getElementById(name) as HTMLInputElement;
  box.checked = flag(name);
  box.addEventListener("change", () => {
    if (box.checked) params.set(name, "1");
    else params.delete(name);
    location.search = params.toString();
  });
}
document.body.classList.toggle("dark", flag("dark"));
// ?clean hides the dev controls, for screenshots.
if (flag("clean")) (document.querySelector(".controls") as HTMLElement).style.display = "none";

const panel = document.createElement("populife-panel") as PopulifePanel;
const hass = createMockHass({
  language: flag("ru") ? "ru" : "en",
  canOperate: !flag("denied"),
  clockDrift: flag("drift") ? 95 : 4.2,
});
panel.hass = hass;
panel.narrow = flag("narrow");
document.body.append(panel);

// Re-render after commands, the way Home Assistant hands over a new `hass` on state changes.
const original = hass.callService.bind(hass);
hass.callService = async (...args: Parameters<typeof original>) => {
  const result = await original(...args);
  panel.hass = { ...hass, states: { ...hass.states } };
  return result;
};
document.addEventListener("hass-notification", (event) => {
  console.info("toast:", (event as CustomEvent<{ message: string }>).detail.message);
});

// ?dialog opens the add-passcode dialog (?temporary picks a temporary code, ?custom a custom
// window), for screenshots.
if (flag("dialog")) {
  setTimeout(() => {
    const safe = panel.shadowRoot?.querySelector("populife-safe");
    const dialog = safe?.shadowRoot?.querySelector("populife-passcode-dialog") as
      | (HTMLElement & {
          open(): void;
          _name: string;
          _temporary: boolean;
          _preset: string;
          _end: string;
        })
      | null;
    dialog?.open();
    if (dialog) {
      dialog._name = flag("ru") ? "Гость" : "Guest";
      dialog._temporary = flag("temporary") || flag("custom");
      if (flag("custom")) {
        const end = new Date();
        end.setDate(end.getDate() + 2);
        end.setHours(18, 0, 0, 0);
        dialog._preset = "custom";
        dialog._end = toLocalInput(end);
      }
    }
  }, 700);
}
