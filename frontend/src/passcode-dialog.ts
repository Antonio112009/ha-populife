/**
 * The "add passcode" dialog. The code is generated up front, so adding one is: type a name,
 * pick how long it works, add. Afterwards the dialog shows the code with copy and share, so
 * it can go straight to whoever it is for.
 */

import { LitElement, css, html, nothing } from "lit";

import { copyText } from "./clipboard";
import { type TextKey, translator } from "./i18n";
import {
  WINDOW_PRESETS,
  type WindowPreset,
  checkCode,
  checkWindow,
  formatDateTime,
  formatDuration,
  presetWindow,
  toLocalInput,
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
    _startNow: { state: true },
    _copied: { state: true },
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
  /** In a custom window: the code works from the moment it is added. */
  declare _startNow: boolean;
  declare _copied: "code" | "message" | null;
  declare _end: string;
  declare _busy: boolean;
  declare _touched: boolean;
  declare _added: NewPasscode | null;

  /** Called with the new passcode; throws to keep the form open. */
  onSubmit: ((passcode: NewPasscode) => Promise<void>) | null = null;
  /**
   * Called to copy (`share` false) or share an added passcode; resolves to whether it did.
   * `host` is where a copy fallback may put its textarea (the page behind a modal is inert).
   */
  onShare: ((passcode: NewPasscode, share: boolean, host: Node) => Promise<boolean>) | null = null;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this.knownCodes = [];
    this.reset();
  }

  private reset(): void {
    this._name = "";
    this._code = "";
    this._temporary = false;
    this._startNow = true;
    this._copied = null;
    this.applyPreset("24h");
    this._busy = false;
    this._touched = false;
    this._added = null;
  }

  private applyPreset(preset: WindowPreset): void {
    this._preset = preset;
    const now = new Date();
    const window = presetWindow(preset, now);
    if (window) {
      this._start = window.start;
      this._end = window.end;
    } else {
      // Custom starts from the last preset's window; "right away" unless that began later.
      this._startNow =
        this._start === "" || new Date(this._start).getTime() <= now.getTime() + 60_000;
    }
  }

  /** The start to use: empty means from the moment the code is added. */
  private get start(): string {
    return this._preset === "custom" && this._startNow ? "" : this._start;
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
    const problem = checkWindow(this.start, this._end);
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
      start: this._temporary && this.start !== "" ? this.start : null,
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
    const end = passcode.end;
    if (end === null) return fill("summary_permanent", { who });
    // A start within the current minute reads as "from now".
    if (passcode.start === null || new Date(passcode.start).getTime() <= Date.now() + 60_000) {
      return fill("summary_from_now", { who, end: formatDateTime(end, this.language) });
    }
    return fill("summary_temporary", {
      who,
      start: formatDateTime(passcode.start, this.language),
      end: formatDateTime(end, this.language),
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
    const valid = this.windowProblem === null;
    const from = this.start === "" ? new Date() : new Date(this.start);
    const duration = valid
      ? formatDuration(new Date(this._end).getTime() - from.getTime(), this.language)
      : null;
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
      ${this._preset === "custom" ? this.renderCustom(problem) : nothing}
      ${
        duration
          ? html`<div class="duration">
              <ha-icon icon="mdi:timer-outline"></ha-icon>${t("works_for", { duration })}
            </div>`
          : nothing
      }
      ${problem ? html`<span class="error">${t(problem)}</span>` : nothing}
      <p class="muted small">${t("clock_note")}</p>
    `;
  }

  private renderCustom(problem: TextKey | null) {
    const t = this.t;
    return html`<div class="window">
      <div class="field">
        <span class="field-label">
          <ha-icon icon="mdi:play-circle-outline"></ha-icon>${t("starts_label")}
        </span>
        <div class="mini-segmented" role="radiogroup" aria-label=${t("starts_label")}>
          ${([true, false] as const).map(
            (now) =>
              html`<button
                type="button"
                role="radio"
                aria-checked=${this._startNow === now}
                class=${this._startNow === now ? "selected" : ""}
                @click=${() => {
                  this._startNow = now;
                  if (!now && (this._start === "" || new Date(this._start) < new Date())) {
                    this._start = toLocalInput(new Date());
                  }
                }}
              >
                ${now ? t("start_now") : t("start_at")}
              </button>`,
          )}
        </div>
        ${
          this._startNow
            ? nothing
            : this.renderDateTime("start", this._start, (value) => (this._start = value), false)
        }
      </div>
      <div class="field">
        <span class="field-label">
          <ha-icon icon="mdi:stop-circle-outline"></ha-icon>${t("stops_label")}
        </span>
        ${this.renderDateTime("end", this._end, (value) => (this._end = value), problem !== null)}
      </div>
    </div>`;
  }

  /** A date and a time field for one datetime-local value ("" when the date is cleared). */
  private renderDateTime(
    id: string,
    value: string,
    set: (value: string) => void,
    invalid: boolean,
  ) {
    const t = this.t;
    const date = value.slice(0, 10);
    const time = value.slice(11, 16) || "12:00";
    return html`<div class="date-time">
      <input
        id=${`${id}-date`}
        type="date"
        aria-label=${id === "start" ? t("valid_from") : t("valid_until")}
        min=${toLocalInput(new Date()).slice(0, 10)}
        .value=${date}
        aria-invalid=${invalid}
        @input=${(e: Event) => {
          const picked = (e.target as HTMLInputElement).value;
          set(picked ? `${picked}T${time}` : "");
        }}
      />
      <input
        id=${`${id}-time`}
        type="time"
        aria-label=${id === "start" ? t("valid_from") : t("valid_until")}
        .value=${time}
        aria-invalid=${invalid}
        @input=${(e: Event) => {
          const picked = (e.target as HTMLInputElement).value;
          if (picked) set(`${date || toLocalInput(new Date()).slice(0, 10)}T${picked}`);
        }}
      />
    </div>`;
  }

  private async copy(passcode: NewPasscode, what: "code" | "message"): Promise<void> {
    const host = this.shadowRoot?.querySelector("dialog") ?? document.body;
    let done = false;
    if (what === "message") {
      done = (await this.onShare?.(passcode, false, host)) ?? false;
    } else {
      try {
        await copyText(passcode.code, host);
        done = true;
      } catch {
        // The code stays on screen to copy by hand.
      }
    }
    if (!done) return;
    this._copied = what;
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => (this._copied = null), 1500);
  }

  private renderAdded(passcode: NewPasscode) {
    const t = this.t;
    return html`
      <div class="added">
        <div class="tick"><ha-icon icon="mdi:check"></ha-icon></div>
        <h2 id="heading">${t("success")}</h2>
        <button
          class="big-code mono ${this._copied === "code" ? "copied" : ""}"
          title=${t("tap_to_copy")}
          @click=${() => void this.copy(passcode, "code")}
        >
          ${passcode.code}
          <ha-icon icon=${this._copied === "code" ? "mdi:check" : "mdi:content-copy"}></ha-icon>
        </button>
        <span class="muted small">
          ${this._copied === "code" ? t("code_copied") : t("tap_to_copy")}
        </span>
        <p class="summary">${this.summary(passcode)}</p>
        <div class="share">
          <button
            class=${this._copied === "message" ? "copied" : ""}
            @click=${() => void this.copy(passcode, "message")}
          >
            <ha-icon
              icon=${this._copied === "message" ? "mdi:check" : "mdi:content-copy"}
            ></ha-icon>
            ${this._copied === "message" ? t("copied") : t("copy")}
          </button>
          <button
            @click=${() =>
              void this.onShare?.(
                passcode,
                true,
                this.shadowRoot?.querySelector("dialog") ?? document.body,
              )}
          >
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
        background: var(--secondary-background-color);
        border-radius: 16px;
        display: grid;
        gap: 14px;
        padding: 14px;
      }
      .field {
        display: grid;
        gap: 8px;
      }
      .field-label {
        align-items: center;
        color: var(--secondary-text-color);
        display: flex;
        font-size: 0.8rem;
        font-weight: 500;
        gap: 6px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .field-label ha-icon {
        --mdc-icon-size: 18px;
        color: var(--primary-color);
      }
      .mini-segmented {
        background: var(--card-background-color, #fff);
        border-radius: 12px;
        display: grid;
        gap: 4px;
        grid-template-columns: 1fr 1fr;
        padding: 4px;
      }
      .mini-segmented button {
        border: none;
        border-radius: 9px;
        font-size: 0.9rem;
        justify-content: center;
        min-height: 36px;
      }
      .mini-segmented button.selected {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        font-weight: 500;
      }
      .date-time {
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
      }
      .date-time input {
        background: var(--card-background-color, #fff);
      }
      .duration {
        align-items: center;
        color: var(--primary-color);
        display: flex;
        font-weight: 500;
        gap: 6px;
      }
      .duration ha-icon {
        --mdc-icon-size: 18px;
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
      button.big-code {
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
        border: 1px dashed color-mix(in srgb, var(--primary-color) 40%, transparent);
        border-radius: 16px;
        color: var(--primary-text-color);
        font-size: 2.4rem;
        font-weight: 500;
        gap: 12px;
        letter-spacing: 0.25em;
        padding: 6px 18px 6px 24px;
      }
      button.big-code ha-icon {
        --mdc-icon-size: 22px;
        color: var(--primary-color);
      }
      button.big-code.copied,
      .share button.copied {
        border-color: var(--success-color, #43a047);
        color: var(--success-color, #43a047);
      }
      button.big-code.copied ha-icon {
        color: var(--success-color, #43a047);
      }
      .added > .muted {
        margin-top: -10px;
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
