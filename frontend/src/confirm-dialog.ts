/** A small confirmation dialog built on the native <dialog> element. */

import { LitElement, css, html } from "lit";

import { shared } from "./styles";

export class PopulifeConfirm extends LitElement {
  static override properties = {
    heading: {},
    text: {},
    confirmLabel: { attribute: false },
    cancelLabel: { attribute: false },
    danger: { type: Boolean },
  };

  declare heading: string;
  declare text: string;
  declare confirmLabel: string;
  declare cancelLabel: string;
  declare danger: boolean;

  private resolve: ((confirmed: boolean) => void) | null = null;

  /** Open the dialog; resolves to whether the user confirmed. */
  ask(): Promise<boolean> {
    this.shadowRoot?.querySelector("dialog")?.showModal();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private close(confirmed: boolean): void {
    this.shadowRoot?.querySelector("dialog")?.close();
    this.resolve?.(confirmed);
    this.resolve = null;
  }

  override render() {
    return html`
      <dialog
        aria-labelledby="heading"
        @cancel=${(event: Event) => {
          event.preventDefault();
          this.close(false);
        }}
      >
        <h2 id="heading">${this.heading}</h2>
        <p class="muted">${this.text}</p>
        <div class="actions">
          <button
            @click=${() => {
              this.close(false);
            }}
          >
            ${this.cancelLabel}
          </button>
          <button
            class=${this.danger ? "danger" : "primary"}
            @click=${() => {
              this.close(true);
            }}
          >
            ${this.confirmLabel}
          </button>
        </div>
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
        max-width: min(420px, calc(100vw - 32px));
        padding: 24px;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.45);
      }
      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
    `,
  ];
}

if (!customElements.get("populife-confirm"))
  customElements.define("populife-confirm", PopulifeConfirm);
