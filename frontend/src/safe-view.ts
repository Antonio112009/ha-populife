/** One safe: its state and actions, passcodes, activity and fingerprints. */

import { LitElement, type PropertyValues, css, html, nothing } from "lit";

import type { PopulifeConfirm } from "./confirm-dialog";
import "./confirm-dialog";
import "./hold-button";
import { actionKey, methodKey, translator } from "./i18n";
import {
  type ActivityFilter,
  METHOD_ICONS,
  batteryLevel,
  lastUsed,
  signalQuality,
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

  private async setLocked(locked: boolean): Promise<void> {
    const lock = this.safe.entities.lock;
    if (!lock) return;
    await this.run("lock", () =>
      this.hass.callService("lock", locked ? "lock" : "unlock", { entity_id: lock }),
    );
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
        .onShare=${(passcode: NewPasscode, share: boolean) => {
          const added: Passcode = {
            ...passcode,
            name: passcode.name || null,
            type: null,
            on_safe: true,
          };
          return share ? this.share(added) : this.copy(this.shareText(added));
        }}
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
    return html`
      <section class="card wide hero ${locked ? "is-locked" : reachable ? "is-open" : "is-gone"}">
        <div class="hero-text">
          <div class="title-row">
            <h2>${this.safe.title}</h2>
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
          <div class="state">
            <ha-icon
              icon=${locked ? "mdi:lock" : reachable ? "mdi:lock-open-variant" : "mdi:lock-question"}
            ></ha-icon>
            ${stateLabel}
          </div>
          <div class="muted">${this.renderLastOpened()}</div>
          <div class="chips">${this.renderChips()}</div>
        </div>
        ${
          this.safe.can_operate
            ? html`<populife-hold-button
                class="action"
                icon=${locked ? "mdi:lock-open-variant" : "mdi:lock"}
                label=${locked ? t("unlock") : t("lock")}
                hint=${locked ? t("hold_to_unlock") : t("tap_to_lock")}
                ?hold=${locked}
                ?disabled=${!reachable || moving}
                ?busy=${this._busy === "lock" || moving}
                @activate=${() => void this.setLocked(!locked)}
              ></populife-hold-button>`
            : nothing
        }
      </section>
    `;
  }

  private renderLastOpened() {
    const t = this.t;
    const lastUnlock = this.entity("last_unlock")?.state;
    if (lastUnlock === undefined || Number.isNaN(Date.parse(lastUnlock))) {
      return html`${t("last_unlock")}: ${t("never")}`;
    }
    const by = this.entity("last_unlocked_by")?.state;
    const method = this.entity("last_unlock_method")?.state;
    const parts = [relativeTime(new Date(lastUnlock), new Date(), this.language)];
    if (by && by !== "unknown" && by !== "unavailable") parts.push(by);
    if (method && method in METHOD_ICONS) {
      parts.push(method === "app" && by ? t("via_ha") : t(methodKey(method)));
    }
    return html`${t("last_unlock")}: ${parts.join(" · ")}`;
  }

  private renderChips() {
    const t = this.t;
    const chips = [];
    const battery = Number(this.entity("battery")?.state);
    if (!Number.isNaN(battery)) {
      const level = batteryLevel(battery);
      const icon =
        level === "bad" ? "mdi:battery-alert" : level === "warn" ? "mdi:battery-30" : "mdi:battery";
      chips.push(
        html`<span class="chip ${level}"><ha-icon icon=${icon}></ha-icon>${battery}%</span>`,
      );
    }
    const signal = Number(this.entity("signal")?.state);
    if (!Number.isNaN(signal)) {
      const quality = signalQuality(signal);
      chips.push(
        html`<span class="chip ${quality === "weak" ? "warn" : "neutral"}" title=${`${signal} dBm`}
          ><ha-icon icon=${quality === "weak" ? "mdi:wifi-strength-1" : "mdi:bluetooth"}></ha-icon
          >${t(`signal_${quality}`)}</span
        >`,
      );
    }
    const drift = Number(this.entity("clock_drift")?.state);
    if (!Number.isNaN(drift)) {
      const off = Math.abs(drift) >= 60;
      chips.push(
        html`<span class="chip ${off ? "warn" : "neutral"}"
          ><ha-icon icon="mdi:clock-outline"></ha-icon>${
            off ? t("clock_off", { seconds: Math.round(drift) }) : t("clock_ok")
          }</span
        >`,
      );
      if (off && this.safe.can_operate && this.safe.entities.sync_clock) {
        chips.push(
          html`<button
            class="chip-button"
            ?disabled=${this._busy !== null}
            @click=${() => void this.press("sync_clock")}
          >
            <ha-icon icon="mdi:clock-check-outline"></ha-icon>${t("sync_clock")}
          </button>`,
        );
      }
    }
    const autoLock = Number(this.entity("auto_lock")?.state);
    if (!Number.isNaN(autoLock)) {
      chips.push(
        html`<span class="chip neutral"
          ><ha-icon icon="mdi:timer-lock-outline"></ha-icon>${
            autoLock > 0 ? t("auto_lock_after", { seconds: autoLock }) : t("auto_lock_off")
          }</span
        >`,
      );
    }
    return chips;
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
                          ${this.renderLastUsed(passcode)}
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

  private renderLastUsed(passcode: Passcode) {
    const used = lastUsed(passcode.name, this._operations ?? []);
    return used
      ? html`<span class="used"
          >${this.t("used", { when: relativeTime(used, new Date(), this.language) })}</span
        >`
      : nothing;
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
                                  ${t(methodKey(op.method))}${op.credential ? ` #${op.credential}` : ""}${
                                    op.via === "home_assistant" ? ` · ${t("via_ha")}` : ""
                                  }
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
      .hero {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 16px 24px;
        justify-content: space-between;
      }
      .is-locked {
        --state-color: var(--state-lock-locked-color, var(--success-color, #43a047));
      }
      .is-open {
        --state-color: var(--state-lock-unlocked-color, var(--error-color, #db4437));
      }
      .is-gone {
        --state-color: var(--disabled-text-color, var(--secondary-text-color));
      }
      .hero-text {
        display: grid;
        flex: 1 1 280px;
        gap: 6px;
        min-width: 0;
      }
      .title-row {
        align-items: center;
        display: flex;
        gap: 4px;
        justify-content: space-between;
      }
      .title-row h2 {
        color: var(--secondary-text-color);
        font-size: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .state {
        align-items: center;
        color: var(--state-color);
        display: flex;
        font-size: 2rem;
        font-weight: 500;
        gap: 10px;
      }
      .state ha-icon {
        --mdc-icon-size: 34px;
      }
      .chips {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .chips .chip {
        align-items: center;
        font-size: 0.8rem;
        padding: 4px 10px;
      }
      .chips ha-icon {
        --mdc-icon-size: 16px;
      }
      .chip-button {
        font-size: 0.8rem;
        min-height: 28px;
        padding: 0 10px;
      }
      .action {
        --hold-color: var(--primary-color);
        margin: 0 auto;
      }
      .used {
        color: var(--secondary-text-color);
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

function errorText(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

if (!customElements.get("populife-safe")) customElements.define("populife-safe", PopulifeSafeView);
