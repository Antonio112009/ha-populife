/** The Populife sidebar panel: Home Assistant creates <populife-panel> and sets `hass` on it. */

import { LitElement, type PropertyValues, css, html, nothing } from "lit";

import { translator } from "./i18n";
import "./safe-view";
import { shared } from "./styles";
import type { HomeAssistant, Safe } from "./types";

export class PopulifePanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    _safes: { state: true },
    _selected: { state: true },
  };

  // Home Assistant sets this after creating the element.
  declare hass: HomeAssistant | undefined;
  declare narrow: boolean;
  declare _safes: Safe[] | null;
  declare _selected: string | null;

  constructor() {
    super();
    this.narrow = false;
    this._safes = null;
    this._selected = null;
  }

  override willUpdate(changed: PropertyValues<this>): void {
    // Load the safes once Home Assistant hands over its connection.
    if (changed.has("hass") && this._safes === null && this.hass) void this.loadSafes(this.hass);
  }

  private async loadSafes(hass: HomeAssistant): Promise<void> {
    this._safes = [];
    const { safes } = await hass.callWS<{ safes: Safe[] }>({ type: "populife/safes" });
    this._safes = safes;
    this._selected = safes[0]?.entry_id ?? null;
  }

  override render() {
    if (!this.hass) return nothing;
    const t = translator(this.hass.locale?.language ?? this.hass.language);
    const safes = this._safes ?? [];
    const safe = safes.find((s) => s.entry_id === this._selected);
    return html`
      <header class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <div class="title">${t("title")}</div>
        ${
          safes.length > 1
            ? html`<select
                aria-label=${t("title")}
                @change=${(e: Event) => (this._selected = (e.target as HTMLSelectElement).value)}
              >
                ${safes.map(
                  (s) =>
                    html`<option value=${s.entry_id} ?selected=${s.entry_id === this._selected}>
                      ${s.title}
                    </option>`,
                )}
              </select>`
            : nothing
        }
      </header>
      <main>
        ${
          this._safes === null
            ? html`<p class="message muted">${t("loading")}</p>`
            : safe === undefined
              ? html`<p class="message muted">${t("no_safes")}</p>`
              : html`<populife-safe
                  .hass=${this.hass}
                  .safe=${safe}
                  ?narrow=${this.narrow}
                ></populife-safe>`
        }
      </main>
    `;
  }

  static override styles = [
    shared,
    css`
      :host {
        background: var(--primary-background-color);
        display: block;
        min-height: 100vh;
      }
      .toolbar {
        align-items: center;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, var(--text-primary-color, #fff));
        display: flex;
        gap: 8px;
        height: var(--header-height, 56px);
        padding: 0 12px;
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .title {
        flex: 1;
        font-size: 1.25rem;
        margin-left: 8px;
      }
      .toolbar select {
        background: transparent;
        border-color: currentColor;
        color: inherit;
        max-width: 50%;
        width: auto;
      }
      .message {
        padding: 32px;
        text-align: center;
      }
    `,
  ];
}

if (!customElements.get("populife-panel")) customElements.define("populife-panel", PopulifePanel);
