/** The "add passcode" dialog: name, code (or generate), type and validity window. */

import { LitElement, css, html, nothing } from "lit";

import { type TextKey, translator } from "./i18n";
import { checkCode, checkWindow, defaultWindow } from "./logic";
import { shared } from "./styles";
import type { HomeAssistant, Safe } from "./types";

export interface NewPasscode {
  name: string;
  code: string;
  start: string | null;
  end: string | null;
}

export class PopulifePasscodeDialog extends LitElement {
  static override properties = {
    hass: { attribute: false },
    safe: { attribute: false },
    knownCodes: { attribute: false },
    _name: { state: true },
    _code: { state: true },
    _temporary: { state: true },
    _start: { state: true },
    _end: { state: true },
    _busy: { state: true },
    _touched: { state: true },
  };

  declare hass: HomeAssistant;
  declare safe: Safe;
  declare knownCodes: string[];
  declare _name: string;
  declare _code: string;
  declare _temporary: boolean;
  declare _start: string;
  declare _end: string;
  declare _busy: boolean;
  declare _touched: boolean;

  /** Called with the new passcode; throws to keep the dialog open with an error. */
  onSubmit: ((passcode: NewPasscode) => Promise<void>) | null = null;

  constructor() {
    super();
    this.knownCodes = [];
    this.reset();
  }

  private reset(): void {
    const window = defaultWindow(new Date());
    this._name = "";
    this._code = "";
    this._temporary = false;
    this._start = window.start;
    this._end = window.end;
    this._busy = false;
    this._touched = false;
  }

  open(): void {
    this.reset();
    this.shadowRoot?.querySelector("dialog")?.showModal();
  }

  private close(): void {
    this.shadowRoot?.querySelector("dialog")?.close();
  }

  private get t() {
    return translator(this.hass.locale?.language ?? this.hass.language);
  }

  private get codeProblem(): TextKey | null {
    const problem = checkCode(this._code, this.knownCodes);
    return problem === null ? null : `error_${problem}`;
  }

  private get windowProblem(): TextKey | null {
    if (!this._temporary) return null;
    const problem = checkWindow(this._start, this._end);
    return problem === null ? null : `error_${problem}`;
  }

  private async generate(): Promise<void> {
    const { code } = await this.hass.callWS<{ code: string }>({
      type: "populife/generate",
      entry_id: this.safe.entry_id,
    });
    this._code = code;
  }

  private async submit(event: Event): Promise<void> {
    event.preventDefault();
    this._touched = true;
    if (this.codeProblem !== null || this.windowProblem !== null || this.onSubmit === null) {
      return;
    }
    this._busy = true;
    try {
      await this.onSubmit({
        name: this._name.trim(),
        code: this._code,
        start: this._temporary ? this._start : null,
        end: this._temporary ? this._end : null,
      });
      this.close();
    } finally {
      this._busy = false;
    }
  }

  override render() {
    const t = this.t;
    const codeProblem = this._touched || this._code !== "" ? this.codeProblem : null;
    const windowProblem = this._touched ? this.windowProblem : null;
    return html`
      <dialog aria-labelledby="heading">
        <form @submit=${(e: Event) => void this.submit(e)}>
          <h2 id="heading">${t("add_passcode")}</h2>
          <label>
            ${t("name")}
            <input
              .value=${this._name}
              placeholder=${t("name_hint")}
              maxlength="60"
              autocomplete="off"
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
            />
          </label>
          <label>
            ${t("code")}
            <div class="row">
              <input
                class="code"
                inputmode="numeric"
                autocomplete="off"
                maxlength="9"
                .value=${this._code}
                aria-invalid=${codeProblem !== null}
                @input=${(e: Event) => (this._code = (e.target as HTMLInputElement).value.trim())}
              />
              <button type="button" @click=${() => void this.generate()}>
                <ha-icon icon="mdi:dice-multiple"></ha-icon>${t("generate")}
              </button>
            </div>
            ${codeProblem ? html`<span class="error">${t(codeProblem)}</span>` : nothing}
          </label>
          <div class="segmented" role="radiogroup" aria-label=${t("type")}>
            <button
              type="button"
              role="radio"
              aria-checked=${!this._temporary}
              class=${this._temporary ? "" : "selected"}
              @click=${() => (this._temporary = false)}
            >
              <ha-icon icon="mdi:infinity"></ha-icon>${t("permanent")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked=${this._temporary}
              class=${this._temporary ? "selected" : ""}
              @click=${() => (this._temporary = true)}
            >
              <ha-icon icon="mdi:timer-sand"></ha-icon>${t("temporary")}
            </button>
          </div>
          ${
            this._temporary
              ? html`
                  <div class="window">
                    <label>
                      ${t("valid_from")}
                      <input
                        type="datetime-local"
                        .value=${this._start}
                        @input=${(e: Event) => (this._start = (e.target as HTMLInputElement).value)}
                      />
                    </label>
                    <label>
                      ${t("valid_until")}
                      <input
                        type="datetime-local"
                        .value=${this._end}
                        aria-invalid=${windowProblem !== null}
                        @input=${(e: Event) => (this._end = (e.target as HTMLInputElement).value)}
                      />
                    </label>
                  </div>
                  ${windowProblem ? html`<span class="error">${t(windowProblem)}</span>` : nothing}
                  <p class="muted small">${t("clock_note")}</p>
                `
              : nothing
          }
          <div class="actions">
            <button
              type="button"
              @click=${() => {
                this.close();
              }}
            >
              ${t("cancel")}
            </button>
            <button type="submit" class="primary" ?disabled=${this._busy}>
              ${this._busy ? t("adding") : t("add")}
            </button>
          </div>
        </form>
      </dialog>
    `;
  }

  static override styles = [
    shared,
    css`
      dialog {
        background: var(--card-background-color, #fff);
        border: none;
        border-radius: var(--ha-dialog-border-radius, 24px);
        color: var(--primary-text-color);
        box-sizing: border-box;
        max-height: calc(100dvh - 32px);
        max-width: calc(100vw - 32px);
        overflow-y: auto;
        padding: 24px;
        width: 440px;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.45);
      }
      form {
        display: grid;
        gap: 16px;
      }
      .row {
        display: flex;
        gap: 8px;
      }
      .code {
        font-family: var(--ha-font-family-code, monospace);
        font-size: 1.2rem;
        letter-spacing: 0.2em;
      }
      .segmented {
        border: 1px solid var(--divider-color);
        border-radius: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        overflow: hidden;
      }
      .segmented button {
        border: none;
        border-radius: 0;
        justify-content: center;
      }
      .segmented button.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
        color: var(--primary-color);
        font-weight: 500;
      }
      .window {
        display: grid;
        gap: 12px;
        grid-template-columns: 1fr 1fr;
      }
      @media (max-width: 480px) {
        .window {
          grid-template-columns: 1fr;
        }
      }
      [aria-invalid="true"] {
        border-color: var(--error-color);
      }
      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    `,
  ];
}

if (!customElements.get("populife-passcode-dialog"))
  customElements.define("populife-passcode-dialog", PopulifePasscodeDialog);
