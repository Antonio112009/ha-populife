/**
 * A round action button. With `hold` it only fires after being held down for `duration`
 * milliseconds, drawing a ring as it fills: a deliberate gesture for opening a safe, without a
 * dialog in the way. Works with mouse, touch and keyboard (hold Space or Enter).
 */

import { LitElement, css, html, nothing, svg } from "lit";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export class PopulifeHoldButton extends LitElement {
  static override properties = {
    icon: {},
    label: {},
    hint: {},
    hold: { type: Boolean },
    duration: { type: Number },
    disabled: { type: Boolean, reflect: true },
    busy: { type: Boolean },
    _progress: { state: true },
  };

  declare icon: string;
  declare label: string;
  declare hint: string;
  declare hold: boolean;
  declare duration: number;
  declare disabled: boolean;
  declare busy: boolean;
  declare _progress: number;

  private started: number | null = null;
  private frame: number | null = null;

  constructor() {
    super();
    this.icon = "";
    this.label = "";
    this.hint = "";
    this.hold = false;
    this.duration = 1000;
    this.disabled = false;
    this.busy = false;
    this._progress = 0;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cancel();
  }

  private start(event: Event): void {
    if (this.disabled || this.busy || this.started !== null) return;
    event.preventDefault();
    if (!this.hold) {
      this.fire();
      return;
    }
    this.started = performance.now();
    const tick = (now: number) => {
      if (this.started === null) return;
      this._progress = Math.min((now - this.started) / this.duration, 1);
      if (this._progress >= 1) {
        this.started = null;
        this.fire();
        this.resetSoon();
        return;
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private cancel(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    if (this.started !== null) {
      this.started = null;
      this._progress = 0;
    }
  }

  private resetSoon(): void {
    setTimeout(() => (this._progress = 0), 400);
  }

  private fire(): void {
    this.dispatchEvent(new CustomEvent("activate", { bubbles: true, composed: true }));
  }

  private onKeyDown(event: KeyboardEvent): void {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) this.start(event);
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === " " || event.key === "Enter") this.cancel();
  }

  override render() {
    const offset = CIRCUMFERENCE * (1 - this._progress);
    return html`
      <button
        aria-label=${this.hint ? `${this.label}: ${this.hint}` : this.label}
        ?disabled=${this.disabled}
        aria-busy=${this.busy}
        @pointerdown=${(e: PointerEvent) => {
          this.start(e);
        }}
        @pointerup=${() => {
          this.cancel();
        }}
        @pointerleave=${() => {
          this.cancel();
        }}
        @pointercancel=${() => {
          this.cancel();
        }}
        @keydown=${(e: KeyboardEvent) => {
          this.onKeyDown(e);
        }}
        @keyup=${(e: KeyboardEvent) => {
          this.onKeyUp(e);
        }}
        @contextmenu=${(e: Event) => {
          e.preventDefault();
        }}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r=${RADIUS}></circle>
          ${
            this.hold
              ? svg`<circle
                class="ring"
                cx="60"
                cy="60"
                r=${RADIUS}
                stroke-dasharray=${CIRCUMFERENCE}
                stroke-dashoffset=${offset}
              ></circle>`
              : nothing
          }
        </svg>
        <span class="face">
          <ha-icon icon=${this.busy ? "mdi:dots-horizontal" : this.icon}></ha-icon>
          <span class="label">${this.label}</span>
        </span>
      </button>
      ${this.hint ? html`<div class="hint">${this.hint}</div>` : nothing}
    `;
  }

  static override styles = css`
    :host {
      --hold-color: var(--primary-color);
      align-items: center;
      display: inline-flex;
      flex-direction: column;
      gap: 6px;
      user-select: none;
      -webkit-user-select: none;
    }
    button {
      background: none;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      height: 112px;
      padding: 0;
      position: relative;
      touch-action: none;
      width: 112px;
      -webkit-tap-highlight-color: transparent;
    }
    button:focus-visible {
      outline: 2px solid var(--hold-color);
      outline-offset: 4px;
    }
    button[disabled] {
      cursor: default;
      opacity: 0.45;
    }
    svg {
      inset: 0;
      position: absolute;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 6;
    }
    .track {
      stroke: color-mix(in srgb, var(--hold-color) 22%, transparent);
    }
    .ring {
      stroke: var(--hold-color);
      stroke-linecap: round;
    }
    .face {
      align-items: center;
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--hold-color) 75%, #fff) 0%,
        var(--hold-color) 55%,
        color-mix(in srgb, var(--hold-color) 85%, #000) 100%
      );
      border-radius: 50%;
      box-shadow: 0 6px 18px color-mix(in srgb, var(--hold-color) 40%, transparent);
      color: var(--text-primary-color, #fff);
      display: flex;
      flex-direction: column;
      gap: 2px;
      inset: 10px;
      justify-content: center;
      position: absolute;
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }
    button:hover:not([disabled]) .face {
      box-shadow: 0 8px 24px color-mix(in srgb, var(--hold-color) 50%, transparent);
    }
    button:active:not([disabled]) .face {
      transform: scale(0.96);
    }
    .face ha-icon {
      --mdc-icon-size: 30px;
    }
    .label {
      font: inherit;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 0.75rem;
      text-align: center;
    }
  `;
}

if (!customElements.get("populife-hold-button"))
  customElements.define("populife-hold-button", PopulifeHoldButton);
