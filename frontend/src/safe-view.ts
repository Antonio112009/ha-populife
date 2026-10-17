/** One safe: its state and actions, passcodes, activity and fingerprints. */

import { LitElement, type PropertyValues, css, html, nothing } from "lit";

import type { PopulifeConfirm } from "./confirm-dialog";
import "./confirm-dialog";
import { actionKey, methodKey, translator } from "./i18n";
import {
  type ActivityFilter,
  METHOD_ICONS,
  formatDateTime,
  mask,
  matchesFilter,
  parseOperations,
  passcodeStatus,
  relativeTime,
} from "./logic";
import type { NewPasscode, PopulifePasscodeDialog } from "./passcode-dialog";
import "./passcode-dialog";
import { shared } from "./styles";
import type { HassEntity, HomeAssistant, Operation, Passcode, PasscodeList, Safe } from "./types";

const ACTIVITY_DAYS = 7;
const FILTERS: ActivityFilter[] = ["all", "unlocks", "failed", "alarms"];

export class PopulifeSafeView extends LitElement {
  static override properties = {
    hass: { attribute: false },
    safe: { attribute: false },
    narrow: { type: Boolean },
    _list: { state: true },
    _operations: { state: true },
    _filter: { state: true },
    _revealed: { state: true },
    _busy: { state: true },
    _confirm: { state: true },
  };

  declare hass: HomeAssistant;
  declare safe: Safe;
  declare narrow: boolean;
  declare _list: PasscodeList | null;
  declare _operations: Operation[] | null;
  declare _filter: ActivityFilter;
  declare _revealed: Set<string>;
  declare _busy: string | null;
  declare _confirm: { heading: string; text: string; label: string; danger: boolean };

  /** last_changed of the entities whose change means the lists need reading again. */
  private watched = "";

  constructor() {
    super();
    this._list = null;
    this._operations = null;
    this._filter = "all";
    this._revealed = new Set();
    this._busy = null;
    this._confirm = { heading: "", text: "", label: "", danger: false };
  }

  private get t() {
    return translator(this.hass.locale?.language ?? this.hass.language);
  }

  private get language(): string {
    return this.hass.locale?.language ?? this.hass.language;
  }

  private entity(name: keyof Safe["entities"]): HassEntity | undefined {
    const entityId = this.safe.entities[name];
    return entityId ? this.hass.states[entityId] : undefined;
  }

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("safe")) {
      this._list = null;
      this._operations = null;
      this.watched = "";
    }
  }

  override updated(changed: PropertyValues<this>): void {
    if (!changed.has("hass") && !changed.has("safe")) return;
    // Reload the lists when a passcode or an operation changes, not on every state change.
    const watched = [this.entity("passcodes"), this.entity("operation")]
      .map((state) => state?.last_updated ?? "")
      .join("|");
    if (watched === this.watched) return;
    this.watched = watched;
    void this.loadPasscodes();
    void this.loadActivity();
  }

  private async loadPasscodes(): Promise<void> {
    if (!this.safe.can_operate) return;
    try {
      this._list = await this.hass.callWS<PasscodeList>({
        type: "populife/passcodes",
        entry_id: this.safe.entry_id,
      });
    } catch (error) {
      this.toast(this.t("failed", { error: errorText(error) }));
    }
  }

  private async loadActivity(): Promise<void> {
    const entityId = this.safe.entities.operation;
    if (!entityId) {
      this._operations = [];
      return;
    }
    const start = new Date(Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    try {
      const history = await this.hass.callWS<Record<string, []>>({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        entity_ids: [entityId],
        minimal_response: false,
        no_attributes: false,
        significant_changes_only: false,
      });
      this._operations = parseOperations(history, entityId);
    } catch {
      this._operations = [];
    }
  }

  private toast(message: string): void {
    this.dispatchEvent(
      new CustomEvent("hass-notification", { detail: { message }, bubbles: true, composed: true }),
    );
  }

  private async run(label: string, action: () => Promise<unknown>): Promise<boolean> {
    this._busy = label;
    try {
      await action();
      return true;
    } catch (error) {
      this.toast(this.t("failed", { error: errorText(error) }));
      return false;
    } finally {
      this._busy = null;
    }
  }

  private async confirm(heading: string, text: string, label: string, danger: boolean) {
    this._confirm = { heading, text, label, danger };
    await this.updateComplete;
    const dialog = this.shadowRoot?.querySelector<PopulifeConfirm>("populife-confirm");
    return dialog ? dialog.ask() : false;
  }

  private async toggleLock(locked: boolean): Promise<void> {
    const lock = this.safe.entities.lock;
    if (!lock) return;
    const t = this.t;
    if (
      !locked ||
      (await this.confirm(
        t("confirm_unlock", { name: this.safe.title }),
        t("confirm_unlock_text"),
        t("unlock"),
        false,
      ))
    ) {
      await this.run("lock", () =>
        this.hass.callService("lock", locked ? "unlock" : "lock", { entity_id: lock }),
      );
    }
  }

  private press(button: "refresh" | "sync_clock"): Promise<boolean> {
    const entityId = this.safe.entities[button];
    return this.run(button, () =>
      this.hass.callService("button", "press", { entity_id: entityId }),
    );
  }

  private async addPasscode(passcode: NewPasscode): Promise<void> {
    const data: Record<string, unknown> = {
      entity_id: this.safe.entities.lock,
      code: passcode.code,
    };
    if (passcode.name) data.name = passcode.name;
    if (passcode.end) {
      data.end = passcode.end;
      if (passcode.start) data.start = passcode.start;
    }
    // Errors propagate so the dialog stays open; the toast says why.
    try {
      await this.hass.callService("populife", "add_passcode", data);
    } catch (error) {
      this.toast(this.t("failed", { error: errorText(error) }));
      throw error;
    }
    this.toast(this.t("added", { name: passcode.name || this.t("unnamed") }));
    await this.loadPasscodes();
  }

  private async deletePasscode(passcode: Passcode): Promise<void> {
    const t = this.t;
    const name = passcode.name ?? t("unnamed");
    if (
      await this.confirm(t("confirm_delete", { name }), t("confirm_delete_text"), t("delete"), true)
    ) {
      const ok = await this.run(`delete:${passcode.code}`, () =>
        this.hass.callService("populife", "delete_passcode", {
          entity_id: this.safe.entities.lock,
          code: passcode.code,
        }),
      );
      if (ok) await this.loadPasscodes();
    }
  }

  private shareText(passcode: Passcode): string {
    const t = this.t;
    const window =
      passcode.end !== null
        ? t("share_window", {
            start: passcode.start ? formatDateTime(passcode.start, this.language) : "—",
            end: formatDateTime(passcode.end, this.language),
          })
        : "";
    return t("share_text", { safe: this.safe.title, code: passcode.code, window });
  }

  private async share(passcode: Passcode): Promise<void> {
    const text = this.shareText(passcode);
    if ("share" in navigator) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Cancelled, or not allowed here: fall back to copying.
      }
    }
    await this.copy(text);
  }

  private async copy(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    this.toast(this.t("copied"));
  }

  private toggleReveal(code: string): void {
    const revealed = new Set(this._revealed);
    if (!revealed.delete(code)) revealed.add(code);
    this._revealed = revealed;
  }

  override render() {
    return html`
      <div class="layout ${this.narrow ? "narrow" : ""}">
        ${this.renderStatus()}
        ${
          this.safe.can_operate
            ? html`${this.renderPasscodes()} ${this.renderActivity()} ${this.renderFingerprints()}`
            : html`<div class="card wide muted">${this.t("no_access")}</div>`
        }
      </div>
      <populife-passcode-dialog
        .hass=${this.hass}
        .safe=${this.safe}
        .knownCodes=${this._list?.passcodes.map((p) => p.code) ?? []}
        .onSubmit=${(passcode: NewPasscode) => this.addPasscode(passcode)}
      ></populife-passcode-dialog>
      <populife-confirm
        .heading=${this._confirm.heading}
        .text=${this._confirm.text}
        .confirmLabel=${this._confirm.label}
        .cancelLabel=${this.t("cancel")}
        ?danger=${this._confirm.danger}
      ></populife-confirm>
    `;
  }

  private renderStatus() {
    const t = this.t;
    const lock = this.entity("lock");
    const state = lock?.state ?? "unavailable";
    const locked = state === "locked";
    const moving = state === "locking" || state === "unlocking";
    const reachable = state !== "unavailable";
    const stateLabel =
      state === "locked" || state === "unlocked" || state === "locking" || state === "unlocking"
        ? t(state)
        : reachable
          ? t("unknown")
          : t("unavailable");
    const battery = this.entity("battery")?.state;
    const signal = this.entity("signal")?.state;
    const drift = Number(this.entity("clock_drift")?.state);
    const lastUnlock = this.entity("last_unlock")?.state;
    const lastBy = this.entity("last_unlocked_by")?.state;
    const lastMethod = this.entity("last_unlock_method")?.state;
    const hasLast = lastUnlock !== undefined && !Number.isNaN(Date.parse(lastUnlock));
    return html`
      <section class="card wide status ${locked ? "is-locked" : "is-open"}">
        <div class="lock-icon">
          <ha-icon
            icon=${locked ? "mdi:lock" : reachable ? "mdi:lock-open-variant" : "mdi:lock-question"}
          ></ha-icon>
        </div>
        <div class="status-main">
          <h2>${this.safe.title}</h2>
          <div class="state">${stateLabel}</div>
          <div class="muted small">
            ${t("last_unlock")}:
            ${
              hasLast
                ? html`${relativeTime(new Date(lastUnlock), new Date(), this.language)}
                  ${lastBy && lastBy !== "unknown" ? t("last_unlock_by", { user: lastBy }) : nothing}
                  ${
                    lastMethod && lastMethod in METHOD_ICONS
                      ? html`· ${t(methodKey(lastMethod))}`
                      : nothing
                  }`
                : t("never")
            }
          </div>
        </div>
        <div class="status-actions">
          ${
            this.safe.can_operate
              ? html`<button
                  class="primary big"
                  ?disabled=${!reachable || moving || this._busy === "lock"}
                  @click=${() => void this.toggleLock(locked)}
                >
                  <ha-icon icon=${locked ? "mdi:lock-open-variant" : "mdi:lock"}></ha-icon>
                  ${locked ? t("unlock") : t("lock")}
                </button>`
              : nothing
          }
        </div>
        <div class="metrics">
          ${metric("mdi:battery", t("battery"), battery !== undefined ? `${battery}%` : "—")}
          ${metric("mdi:bluetooth", t("signal"), signal && signal !== "unknown" ? `${signal} dBm` : "—")}
          ${metric(
            "mdi:clock-outline",
            t("clock"),
            Number.isNaN(drift)
              ? "—"
              : Math.abs(drift) < 60
                ? t("clock_ok")
                : t("clock_off", { seconds: Math.round(drift) }),
          )}
          <div class="metric-actions">
            ${
              this.safe.can_operate && this.safe.entities.sync_clock && Math.abs(drift) >= 60
                ? html`<button
                    ?disabled=${this._busy !== null}
                    @click=${() => void this.press("sync_clock")}
                  >
                    <ha-icon icon="mdi:clock-check-outline"></ha-icon>${t("sync_clock")}
                  </button>`
                : nothing
            }
            ${
              this.safe.can_operate && this.safe.entities.refresh
                ? html`<button
                    class="icon"
                    title=${t("refresh")}
                    aria-label=${t("refresh")}
                    ?disabled=${this._busy !== null}
                    @click=${() => void this.press("refresh")}
                  >
                    <ha-icon icon="mdi:refresh"></ha-icon>
                  </button>`
                : nothing
            }
          </div>
        </div>
      </section>
    `;
  }

  private renderPasscodes() {
    const t = this.t;
    if (!this.safe.admin_key) {
      return html`<section class="card">
        <div class="card-header"><h2>${t("passcodes")}</h2></div>
        <p class="muted">${t("passcodes_admin_only")}</p>
      </section>`;
    }
    const passcodes = this._list?.passcodes;
    const now = new Date();
    return html`
      <section class="card passcodes">
        <div class="card-header">
          <h2>${t("passcodes")}</h2>
          <button
            class="primary"
            @click=${() => {
              this.shadowRoot
                ?.querySelector<PopulifePasscodeDialog>("populife-passcode-dialog")
                ?.open();
            }}
          >
            <ha-icon icon="mdi:plus"></ha-icon>${t("add_passcode")}
          </button>
        </div>
        ${
          passcodes === undefined
            ? html`<p class="muted">${t("loading")}</p>`
            : passcodes.length === 0
              ? html`<p class="muted">${t("no_passcodes")}</p>`
              : html`<ul class="list">
                  ${passcodes.map((passcode) => {
                    const status = passcodeStatus(passcode, now);
                    const revealed = this._revealed.has(passcode.code);
                    return html`<li class="passcode ${status}">
                      <ha-icon
                        class="lead"
                        icon=${passcode.end === null ? "mdi:account-key-outline" : "mdi:timer-sand"}
                      ></ha-icon>
                      <div class="grow">
                        <div class="name">${passcode.name ?? t("unnamed")}</div>
                        <div class="small muted">
                          <span class="code"
                            >${revealed ? passcode.code : mask(passcode.code)}</span
                          >
                          ${this.statusChip(passcode, status)}
                          ${
                            passcode.on_safe
                              ? nothing
                              : html`<span class="chip neutral">${t("not_on_safe")}</span>`
                          }
                        </div>
                      </div>
                      <div class="row-actions">
                        <button
                          class="icon"
                          title=${revealed ? t("hide_code") : t("show_code")}
                          aria-label=${revealed ? t("hide_code") : t("show_code")}
                          @click=${() => {
                            this.toggleReveal(passcode.code);
                          }}
                        >
                          <ha-icon
                            icon=${revealed ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                          ></ha-icon>
                        </button>
                        <button
                          class="icon"
                          title=${t("share")}
                          aria-label=${t("share")}
                          @click=${() => void this.share(passcode)}
                        >
                          <ha-icon icon="mdi:share-variant-outline"></ha-icon>
                        </button>
                        <button
                          class="icon delete"
                          title=${t("delete")}
                          aria-label=${t("delete")}
                          ?disabled=${this._busy === `delete:${passcode.code}`}
                          @click=${() => void this.deletePasscode(passcode)}
                        >
                          <ha-icon icon="mdi:delete-outline"></ha-icon>
                        </button>
                      </div>
                    </li>`;
                  })}
                </ul>`
        }
      </section>
    `;
  }

  private statusChip(passcode: Passcode, status: ReturnType<typeof passcodeStatus>) {
    const t = this.t;
    switch (status) {
      case "permanent":
        return html`<span class="chip neutral">${t("status_permanent")}</span>`;
      case "expired":
        return html`<span class="chip bad">${t("status_expired")}</span>`;
      case "upcoming":
        return html`<span class="chip warn"
          >${t("status_upcoming", { when: formatDateTime(passcode.start ?? "", this.language) })}</span
        >`;
      case "active":
        return html`<span class="chip ok"
          >${t("status_active")} ·
          ${t("until", { when: formatDateTime(passcode.end ?? "", this.language) })}</span
        >`;
    }
  }

  private renderActivity() {
    const t = this.t;
    const operations = (this._operations ?? []).filter((op) => matchesFilter(op, this._filter));
    return html`
      <section class="card activity">
        <div class="card-header">
          <h2>${t("activity")}</h2>
          <div class="filters" role="tablist">
            ${FILTERS.map(
              (filter) =>
                html`<button
                  role="tab"
                  aria-selected=${this._filter === filter}
                  class=${this._filter === filter ? "selected" : ""}
                  @click=${() => (this._filter = filter)}
                >
                  ${t(`filter_${filter}`)}
                </button>`,
            )}
          </div>
        </div>
        ${
          this._operations === null
            ? html`<p class="muted">${t("loading")}</p>`
            : operations.length === 0
              ? html`<p class="muted">${t("activity_empty")}</p>`
              : html`<ul class="list timeline">
                  ${operations.map(
                    (op) =>
                      html`<li class=${op.method}>
                        <ha-icon
                          class="lead"
                          icon=${METHOD_ICONS[op.method] ?? METHOD_ICONS.other}
                        ></ha-icon>
                        <div class="grow">
                          <div>
                            ${
                              op.method === "failed" || op.method === "alarm"
                                ? t(methodKey(op.method))
                                : html`${t(actionKey(op.action))}${op.user ? html` · <b>${op.user}</b>` : nothing}`
                            }
                          </div>
                          ${
                            op.method === "failed" || op.method === "alarm"
                              ? nothing
                              : html`<div class="small muted">
                                  ${t(methodKey(op.method))}${op.credential ? ` #${op.credential}` : ""}
                                </div>`
                          }
                        </div>
                        <time
                          class="small muted"
                          datetime=${op.when.toISOString()}
                          title=${formatDateTime(op.when, this.language)}
                        >
                          ${relativeTime(op.when, new Date(), this.language)}
                        </time>
                      </li>`,
                  )}
                </ul>`
        }
      </section>
    `;
  }

  private renderFingerprints() {
    const t = this.t;
    if (!this.safe.admin_key) return nothing;
    const fingerprints = this._list?.fingerprints ?? [];
    return html`
      <section class="card fingerprints">
        <div class="card-header"><h2>${t("fingerprints")}</h2></div>
        ${
          fingerprints.length === 0
            ? html`<p class="muted">${t("no_fingerprints")}</p>`
            : html`<ul class="list">
                ${fingerprints.map(
                  (fp) =>
                    html`<li>
                      <ha-icon class="lead" icon="mdi:fingerprint"></ha-icon>
                      <div class="grow">${t("slot", { slot: fp.slot })}</div>
                      <span class="small muted"
                        >${fp.end ? t("until", { when: formatDateTime(fp.end, this.language) }) : t("status_permanent")}</span
                      >
                    </li>`,
                )}
              </ul>`
        }
        <p class="muted small">${t("fingerprints_note")}</p>
      </section>
    `;
  }

  static override styles = [
    shared,
    css`
      .layout {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0 auto;
        max-width: 1100px;
        padding: 16px;
      }
      .layout.narrow {
        grid-template-columns: minmax(0, 1fr);
        padding: 8px;
      }
      .wide {
        grid-column: 1 / -1;
      }
      .status {
        align-items: center;
        display: grid;
        gap: 12px 16px;
        grid-template-areas: "icon main actions" "metrics metrics metrics";
        grid-template-columns: auto 1fr auto;
      }
      .narrow .status {
        grid-template-areas: "icon main" "actions actions" "metrics metrics";
        grid-template-columns: auto 1fr;
      }
      .lock-icon {
        align-items: center;
        background: color-mix(in srgb, var(--state-color) 15%, transparent);
        border-radius: 50%;
        color: var(--state-color);
        display: flex;
        grid-area: icon;
        height: 64px;
        justify-content: center;
        width: 64px;
      }
      .lock-icon ha-icon {
        --mdc-icon-size: 34px;
      }
      .is-locked {
        --state-color: var(--state-lock-locked-color, var(--success-color, #43a047));
      }
      .is-open {
        --state-color: var(--state-lock-unlocked-color, var(--error-color, #db4437));
      }
      .status-main {
        display: grid;
        gap: 2px;
        grid-area: main;
      }
      .state {
        color: var(--state-color);
        font-size: 1.6rem;
        font-weight: 500;
      }
      .status-actions {
        grid-area: actions;
      }
      .big {
        font-size: 1.05rem;
        justify-content: center;
        min-height: 48px;
        min-width: 160px;
        width: 100%;
      }
      .metrics {
        align-items: center;
        border-top: 1px solid var(--divider-color);
        display: flex;
        flex-wrap: wrap;
        gap: 12px 28px;
        grid-area: metrics;
        padding-top: 12px;
      }
      .metric {
        align-items: center;
        display: flex;
        gap: 8px;
      }
      .metric .value {
        font-weight: 500;
      }
      .metric-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }
      .list {
        display: grid;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .list li {
        align-items: center;
        border-top: 1px solid var(--divider-color);
        display: flex;
        gap: 12px;
        min-height: 56px;
        padding: 6px 0;
      }
      .list li:first-child {
        border-top: none;
      }
      .lead {
        color: var(--secondary-text-color);
        flex: none;
      }
      .grow {
        display: grid;
        flex: 1;
        gap: 2px;
        /* A grid track is otherwise as wide as its longest unbreakable line. */
        grid-template-columns: minmax(0, 1fr);
        min-width: 0;
      }
      .name {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .grow .small {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .grow .chip {
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .narrow .row-actions button.icon {
        min-height: 36px;
        min-width: 36px;
      }
      .activity .card-header {
        flex-wrap: wrap;
      }
      .code {
        font-family: var(--ha-font-family-code, monospace);
        letter-spacing: 0.15em;
      }
      .passcode.expired .name,
      .passcode.expired .code {
        opacity: 0.55;
      }
      .row-actions {
        display: flex;
        flex: none;
      }
      .delete:hover:not([disabled]) {
        color: var(--error-color);
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .filters button {
        font-size: 0.8rem;
        min-height: 28px;
        padding: 0 10px;
      }
      .filters button.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
        border-color: transparent;
        color: var(--primary-color);
      }
      .timeline .failed .lead,
      .timeline .alarm .lead {
        color: var(--error-color);
      }
      .timeline time {
        flex: none;
      }
    `,
  ];
}

function metric(icon: string, label: string, value: string) {
  return html`<div class="metric">
    <ha-icon icon=${icon}></ha-icon>
    <span class="muted">${label}</span>
    <span class="value">${value}</span>
  </div>`;
}

function errorText(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

if (!customElements.get("populife-safe")) customElements.define("populife-safe", PopulifeSafeView);
