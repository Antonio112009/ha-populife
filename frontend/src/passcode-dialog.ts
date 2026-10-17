/**
 * The "add passcode" dialog. The code is generated up front, so adding one is: type a name,
 * pick how long it works, add. Afterwards the dialog shows the code with copy and share, so
 * it can go straight to whoever it is for.
 */

import { LitElement, css, html, nothing } from "lit";

import { type TextKey, translator } from "./i18n";
import {
  WINDOW_PRESETS,
  type WindowPreset,
  checkCode,
  checkWindow,
  formatDateTime,
  presetWindow,
} from "./logic";
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
    _preset: { state: true },
    _start: { state: true },
    _end: { state: true },
    _busy: { state: true },
    _touched: { state: true },
    _added: { state: true },
  };

  declare hass: HomeAssistant;
  declare safe: Safe;
  declare knownCodes: string[];
  declare _name: string;
  declare _code: string;
  declare _temporary: boolean;
  declare _preset: WindowPreset;
  declare _start: string;
  declare _end: string;
  declare _busy: boolean;
  declare _touched: boolean;
  declare _added: NewPasscode | null;

  /** Called with the new passcode; throws to keep the form open. */
  onSubmit: ((passcode: NewPasscode) => Promise<void>) | null = null;
  /** Called to copy (`share` false) or share an added passcode. */
  onShare: ((passcode: NewPasscode, share: boolean) => Promise<void>) | null = null;

  constructor() {
    super();
    this.knownCodes = [];
    this.reset();
  }

  private reset(): void {
    this._name = "";
    this._code = "";
    this._temporary = false;
    this.applyPreset("24h");
    this._busy = false;
    this._touched = false;
    this._added = null;
  }

  private applyPreset(preset: WindowPreset): void {
    this._preset = preset;
    const window = presetWindow(preset, new Date());
    if (window) {
      this._start = window.start;
      this._end = window.end;
    }
  }

  open(): void {
    this.reset();
    this.shadowRoot?.querySelector("dialog")?.showModal();
    void this.generate();
    void this.updateComplete.then(() => {
      this.shadowRoot?.querySelector<HTMLInputElement>("#name")?.focus();
    });
  }

  private close(): void {
    this.shadowRoot?.querySelector("dialog")?.close();
  }

  private get language(): string {
    return this.hass.locale?.language ?? this.hass.language;
  }

  private get t() {
    return translator(this.language);
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

  private draft(): NewPasscode {
    return {
      name: this._name.trim(),
      code: this._code,
      start: this._temporary ? this._start : null,
      end: this._temporary ? this._end : null,
    };
  }

  private async submit(event: Event): Promise<void> {
    event.preventDefault();
    this._touched = true;
    if (this.codeProblem !== null || this.windowProblem !== null || this.onSubmit === null) {
      return;
    }
    this._busy = true;
    const passcode = this.draft();
    try {
      await this.onSubmit(passcode);
      this._added = passcode;
    } catch {
      // The panel has shown why; keep the form so it can be fixed.
    } finally {
      this._busy = false;
    }
  }

  private summary(passcode: NewPasscode) {
    const t = this.t;
    const who = passcode.name || t("whoever");
    const fill = (key: TextKey, values: Record<string, string>) => {
      // Put the code, in bold, where {code} goes.
      const [before = "", after = ""] = t(key, { ...values, code: "\u0000" }).split("\u0000");
      return html`${before}<b class="mono">${passcode.code}</b>${after}`;
    };
    return passcode.end === null
      ? fill("summary_permanent", { who })
      : fill("summary_temporary", {
          who,
          start: formatDateTime(passcode.start ?? new Date(), this.language),
          end: formatDateTime(passcode.end, this.language),
        });
  }

  override render() {
    return html`<dialog aria-labelledby="heading">
      ${this._added ? this.renderAdded(this._added) : this.renderForm()}
    </dialog>`;
  }

  private renderForm() {
    const t = this.t;
    const codeProblem = this._touched || this._code !== "" ? this.codeProblem : null;
    const windowProblem = this._touched ? this.windowProblem : null;
    return html`
      <form @submit=${(e: Event) => void this.submit(e)}>
        <h2 id="heading">${t("add_passcode")}</h2>
        <label>
          ${t("name")}
          <input
            id="name"
            .value=${this._name}
            placeholder=${t("name_hint")}
            maxlength="60"
            autocomplete="off"
            @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
          />
        </label>
        <label>
          ${t("code")}
          <div class="code-row">
            <input
              class="code"
              inputmode="numeric"
              autocomplete="off"
              maxlength="9"
              .value=${this._code}
              aria-invalid=${codeProblem !== null}
              @input=${(e: Event) => (this._code = (e.target as HTMLInputElement).value.trim())}
            />
            <button
              type="button"
              class="icon"
              title=${t("new_code")}
              aria-label=${t("new_code")}
              @click=${() => void this.generate()}
            >
              <ha-icon icon="mdi:dice-multiple"></ha-icon>
            </button>
          </div>
          ${codeProblem ? html`<span class="error">${t(codeProblem)}</span>` : nothing}
        </label>
        <div class="segmented" role="radiogroup" aria-label=${t("type")}>
          ${([false, true] as const).map(
            (temporary) =>
              html`<button
                type="button"
                role="radio"
                aria-checked=${this._temporary === temporary}
                class=${this._temporary === temporary ? "selected" : ""}
                @click=${() => (this._temporary = temporary)}
              >
                <ha-icon icon=${temporary ? "mdi:timer-sand" : "mdi:infinity"}></ha-icon>
                ${temporary ? t("temporary") : t("permanent")}
              </button>`,
          )}
        </div>
        ${this._temporary ? this.renderWindow(windowProblem) : nothing}
        ${
          codeProblem === null && this.windowProblem === null && this._code
            ? html`<p class="summary">${this.summary(this.draft())}</p>`
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
    `;
  }

  private renderWindow(problem: TextKey | null) {
    const t = this.t;
    return html`
      <div class="presets" role="radiogroup">
        ${WINDOW_PRESETS.map(
          (preset) =>
            html`<button
              type="button"
              role="radio"
              aria-checked=${this._preset === preset}
              class=${this._preset === preset ? "selected" : ""}
              @click=${() => {
                this.applyPreset(preset);
              }}
            >
              ${t(`preset_${preset}`)}
            </button>`,
        )}
      </div>
      ${
        this._preset === "custom"
          ? html`<div class="window">
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
                  aria-invalid=${problem !== null}
                  @input=${(e: Event) => (this._end = (e.target as HTMLInputElement).value)}
                />
              </label>
            </div>`
          : nothing
      }
      ${problem ? html`<span class="error">${t(problem)}</span>` : nothing}
      <p class="muted small">${t("clock_note")}</p>
    `;
  }

  private renderAdded(passcode: NewPasscode) {
    const t = this.t;
    return html`
      <div class="added">
        <div class="tick"><ha-icon icon="mdi:check"></ha-icon></div>
        <h2 id="heading">${t("success")}</h2>
        <div class="big-code mono">${passcode.code}</div>
        <p class="summary">${this.summary(passcode)}</p>
        <div class="share">
          <button @click=${() => void this.onShare?.(passcode, false)}>
            <ha-icon icon="mdi:content-copy"></ha-icon>${t("copy")}
          </button>
          <button @click=${() => void this.onShare?.(passcode, true)}>
            <ha-icon icon="mdi:share-variant-outline"></ha-icon>${t("share")}
          </button>
        </div>
        <div class="actions">
          <button
            class="primary"
            @click=${() => {
              this.close();
            }}
          >
            ${t("done")}
          </button>
        </div>
      </div>
    `;
  }

  static override styles = [
    shared,
    css`
      dialog {
        background: var(--card-background-color, #fff);
        border: none;
        border-radius: var(--ha-dialog-border-radius, 24px);
        box-sizing: border-box;
        color: var(--primary-text-color);
        max-height: calc(100dvh - 32px);
        max-width: calc(100vw - 32px);
        overflow-y: auto;
        padding: 24px;
        width: 460px;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.45);
      }
      form,
      .added {
        display: grid;
        gap: 16px;
      }
      .mono {
        font-family: var(--ha-font-family-code, monospace);
      }
      .code-row {
        display: flex;
        gap: 8px;
      }
      .code {
        font-family: var(--ha-font-family-code, monospace);
        font-size: 1.6rem;
        letter-spacing: 0.3em;
        min-height: 52px;
        text-align: center;
      }
      .code-row button.icon {
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        min-height: 52px;
        min-width: 52px;
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
      .segmented button.selected,
      .presets button.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
        border-color: transparent;
        color: var(--primary-color);
        font-weight: 500;
      }
      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .presets button {
        font-size: 0.85rem;
        min-height: 32px;
        padding: 0 12px;
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
      .summary {
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
        border-radius: 12px;
        line-height: 1.4;
        margin: 0;
        padding: 10px 12px;
      }
      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .added {
        justify-items: center;
        text-align: center;
      }
      .added .actions {
        justify-self: stretch;
      }
      .tick {
        align-items: center;
        background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent);
        border-radius: 50%;
        color: var(--success-color, #43a047);
        display: flex;
        height: 56px;
        justify-content: center;
        width: 56px;
      }
      .tick ha-icon {
        --mdc-icon-size: 32px;
      }
      .big-code {
        font-size: 2.4rem;
        font-weight: 500;
        letter-spacing: 0.25em;
      }
      .share {
        display: flex;
        gap: 8px;
      }
    `,
  ];
}

if (!customElements.get("populife-passcode-dialog"))
  customElements.define("populife-passcode-dialog", PopulifePasscodeDialog);
