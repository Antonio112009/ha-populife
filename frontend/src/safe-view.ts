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
  countBy,
  dayName,
  groupByDay,
  hueFor,
  initials,
  lastUsed,
  signalQuality,
  windowProgress,
  formatDateTime,
  mask,
  matchesFilter,
  parseOperations,
  passcodeStatus,
  relativeTime,
} from "./logic";
import type { NewPasscode, PopulifePasscodeDialog } from "./passcode-dialog";
import "./passcode-dialog";
import { copyText } from "./clipboard";
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
    _copied: { state: true },
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
  declare _copied: string | null;
  private copiedTimer?: ReturnType<typeof setTimeout>;
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
    this._copied = null;
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

  /** Open the system share sheet (phones, Safari); copy the message where there is none. */
  private async share(passcode: Passcode, host?: Node): Promise<boolean> {
    const text = this.shareText(passcode);
    if ("share" in navigator) {
      try {
        await navigator.share({ text });
        return true;
      } catch (error) {
        // Closing the sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return false;
      }
    }
    return this.copy(text, this.t("copied"), host);
  }

  private async copy(text: string, done: string, host?: Node): Promise<boolean> {
    try {
      await copyText(text, host);
      this.toast(done);
      return true;
    } catch (error) {
      this.toast(this.t("failed", { error: errorText(error) }));
      return false;
    }
  }

  private async copyCode(code: string): Promise<void> {
    if (!(await this.copy(code, this.t("code_copied")))) return;
    this._copied = code;
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => (this._copied = null), 1500);
  }

  private toggleReveal(code: string): void {
    const revealed = new Set(this._revealed);
    if (!revealed.delete(code)) revealed.add(code);
    this._revealed = revealed;
  }

  override render() {
    return html`
      <div class="layout ${this.narrow ? "narrow" : ""}">
        ${this.renderHero()}
        ${
          this.safe.can_operate
            ? html`${this.renderPasscodes()} ${this.renderActivity()} ${this.renderFingerprints()}`
            : html`<div class="card wide empty">
                <ha-icon icon="mdi:shield-lock-outline"></ha-icon>
                <p>${this.t("no_access")}</p>
              </div>`
        }
      </div>
      <populife-passcode-dialog
        .hass=${this.hass}
        .safe=${this.safe}
        .knownCodes=${this._list?.passcodes.map((p) => p.code) ?? []}
        .onSubmit=${(passcode: NewPasscode) => this.addPasscode(passcode)}
        .onShare=${(passcode: NewPasscode, share: boolean, host: Node) => {
          const added: Passcode = {
            ...passcode,
            name: passcode.name || null,
            type: null,
            on_safe: true,
          };
          return share
            ? this.share(added, host)
            : this.copy(this.shareText(added), this.t("copied"), host);
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

  // Hero: state, the hold-to-unlock button, and the safe's vitals as tiles.

  private renderHero() {
    const t = this.t;
    const state = this.entity("lock")?.state ?? "unavailable";
    const locked = state === "locked";
    const moving = state === "locking" || state === "unlocking";
    const reachable = state !== "unavailable";
    const tone = locked ? "locked" : reachable ? "open" : "gone";
    const stateLabel =
      state === "locked" || state === "unlocked" || state === "locking" || state === "unlocking"
        ? t(state)
        : reachable
          ? t("unknown")
          : t("unavailable");
    return html`
      <section class="card wide hero tone-${tone}">
        <div class="hero-main">
          <div class="hero-badge">
            <ha-icon
              icon=${locked ? "mdi:lock" : reachable ? "mdi:lock-open-variant" : "mdi:lock-question"}
            ></ha-icon>
          </div>
          <div class="hero-text">
            <div class="eyebrow">
              <span>${this.safe.title}</span>
              ${
                this.safe.can_operate && this.safe.entities.refresh
                  ? html`<button
                      class="icon ghost"
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
            <div class="state">${stateLabel}</div>
            <div class="last">${this.renderLastOpened()}</div>
          </div>
          ${
            this.safe.can_operate
              ? html`<populife-hold-button
                  class="action ${locked ? "" : "attention"}"
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
        </div>
        <div class="stats">${this.renderStats()}</div>
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
    const known = by && by !== "unknown" && by !== "unavailable" ? by : null;
    const how =
      method && method in METHOD_ICONS
        ? method === "app" && known
          ? t("via_ha")
          : t(methodKey(method))
        : null;
    return html`
      <ha-icon icon="mdi:history"></ha-icon>
      <span>${relativeTime(new Date(lastUnlock), new Date(), this.language)}</span>
      ${known ? html`${avatar(known, "xs")}<b>${known}</b>` : nothing}
      ${how ? html`<span class="dot">·</span><span>${how}</span>` : nothing}
    `;
  }

  private renderStats() {
    const t = this.t;
    const tiles = [];
    const battery = Number(this.entity("battery")?.state);
    if (!Number.isNaN(battery)) {
      const level = batteryLevel(battery);
      tiles.push(
        html`<div class="stat ${level}">
          <div class="stat-icon">
            <ha-icon
              icon=${level === "bad" ? "mdi:battery-alert-variant-outline" : "mdi:battery-high"}
            ></ha-icon>
          </div>
          <div class="stat-body">
            <div class="stat-label">${t("battery")}</div>
            <div class="stat-value">${battery}%</div>
            <div class="meter">
              <span style="width:${Math.min(Math.max(battery, 0), 100)}%"></span>
            </div>
          </div>
        </div>`,
      );
    }
    const signal = Number(this.entity("signal")?.state);
    if (!Number.isNaN(signal)) {
      const quality = signalQuality(signal);
      const bars = quality === "excellent" ? 3 : quality === "good" ? 2 : 1;
      tiles.push(
        html`<div class="stat ${quality === "weak" ? "warn" : "info"}" title=${`${signal} dBm`}>
          <div class="stat-icon"><ha-icon icon="mdi:bluetooth"></ha-icon></div>
          <div class="stat-body">
            <div class="stat-label">${t("signal")}</div>
            <div class="stat-value">${t(`signal_short_${quality}`)}</div>
            <div class="bars" aria-hidden="true">
              ${[1, 2, 3].map((n) => html`<span class=${n <= bars ? "on" : ""}></span>`)}
            </div>
          </div>
        </div>`,
      );
    }
    const drift = Number(this.entity("clock_drift")?.state);
    if (!Number.isNaN(drift)) {
      const off = Math.abs(drift) >= 60;
      tiles.push(
        html`<div class="stat ${off ? "warn" : "info"}">
          <div class="stat-icon"><ha-icon icon="mdi:clock-outline"></ha-icon></div>
          <div class="stat-body">
            <div class="stat-label">${t("clock")}</div>
            <div class="stat-value">
              ${off ? t("clock_drift_short", { seconds: Math.round(drift) }) : t("clock_ok")}
            </div>
            ${
              off && this.safe.can_operate && this.safe.entities.sync_clock
                ? html`<button
                    class="link"
                    ?disabled=${this._busy !== null}
                    @click=${() => void this.press("sync_clock")}
                  >
                    ${t("sync_clock")}
                  </button>`
                : nothing
            }
          </div>
        </div>`,
      );
    }
    const autoLock = Number(this.entity("auto_lock")?.state);
    if (!Number.isNaN(autoLock)) {
      tiles.push(
        html`<div class="stat info">
          <div class="stat-icon"><ha-icon icon="mdi:timer-lock-outline"></ha-icon></div>
          <div class="stat-body">
            <div class="stat-label">${t("auto_lock")}</div>
            <div class="stat-value">
              ${autoLock > 0 ? t("seconds", { seconds: autoLock }) : t("off")}
            </div>
          </div>
        </div>`,
      );
    }
    return tiles;
  }

  // Passcodes

  private renderPasscodes() {
    const t = this.t;
    if (!this.safe.admin_key) {
      return html`<section class="card">
        <div class="card-header"><h2>${t("passcodes")}</h2></div>
        <div class="empty inline">
          <ha-icon icon="mdi:key-alert-outline"></ha-icon>
          <p>${t("passcodes_admin_only")}</p>
        </div>
      </section>`;
    }
    const passcodes = this._list?.passcodes;
    const now = new Date();
    return html`
      <section class="card passcodes">
        <div class="card-header">
          <h2>
            ${t("passcodes")}
            ${passcodes?.length ? html`<span class="count">${passcodes.length}</span>` : nothing}
          </h2>
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
              ? html`<div class="empty inline">
                  <ha-icon icon="mdi:dialpad"></ha-icon>
                  <p>${t("no_passcodes")}</p>
                </div>`
              : html`<ul class="list">
                  ${passcodes.map((passcode) => this.renderPasscode(passcode, now))}
                </ul>`
        }
      </section>
    `;
  }

  private renderPasscode(passcode: Passcode, now: Date) {
    const t = this.t;
    const status = passcodeStatus(passcode, now);
    const revealed = this._revealed.has(passcode.code);
    const progress = status === "active" ? windowProgress(passcode, now) : null;
    return html`<li class="passcode ${status}">
      ${
        passcode.name
          ? avatar(passcode.name)
          : html`<div class="avatar unnamed"><ha-icon icon="mdi:dialpad"></ha-icon></div>`
      }
      <div class="grow">
        <div class="name-row">
          <span class="name">${passcode.name ?? t("unnamed")}</span>
          ${this.statusChip(passcode, status)}
        </div>
        <div class="small muted">
          <button
            class="code ${this._copied === passcode.code ? "copied" : ""}"
            title=${t("tap_to_copy")}
            aria-label=${`${t("copy")} ${t("code").toLowerCase()}`}
            @click=${() => void this.copyCode(passcode.code)}
          >
            ${revealed ? passcode.code : mask(passcode.code)}
            <ha-icon
              icon=${this._copied === passcode.code ? "mdi:check" : "mdi:content-copy"}
            ></ha-icon>
          </button>
          ${
            passcode.on_safe ? nothing : html`<span class="chip neutral">${t("not_on_safe")}</span>`
          }
          ${this.renderLastUsed(passcode)}
        </div>
        ${
          progress !== null
            ? html`<div class="timeleft" title=${formatDateTime(passcode.end ?? "", this.language)}>
                <div class="meter"><span style="width:${(1 - progress) * 100}%"></span></div>
                <span class="small muted">
                  ${t("ends", { when: relativeTime(new Date(passcode.end ?? ""), now, this.language) })}
                </span>
              </div>`
            : nothing
        }
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
          <ha-icon icon=${revealed ? "mdi:eye-off-outline" : "mdi:eye-outline"}></ha-icon>
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
          >${t("starts", {
            when: relativeTime(new Date(passcode.start ?? ""), new Date(), this.language),
          })}</span
        >`;
      case "active":
        return html`<span class="chip ok">${t("status_active")}</span>`;
    }
  }

  // Activity: a week as a timeline, grouped by day, with counts that double as filters.

  private renderActivity() {
    const t = this.t;
    const all = this._operations ?? [];
    const counts = countBy(all);
    const operations = all.filter((op) => matchesFilter(op, this._filter));
    const now = new Date();
    return html`
      <section class="card activity">
        <div class="card-header">
          <h2>${t("activity")}</h2>
          <span class="small muted">${t("week_summary")}</span>
        </div>
        <div class="filters" role="tablist">
          ${FILTERS.map(
            (filter) =>
              html`<button
                role="tab"
                aria-selected=${this._filter === filter}
                class="filter ${filter} ${this._filter === filter ? "selected" : ""} ${(filter === "failed" || filter === "alarms") && counts[filter] > 0 ? "hot" : ""}"
                @click=${() => (this._filter = filter)}
              >
                <span class="filter-count">${counts[filter]}</span>
                <span class="filter-label">${t(`filter_${filter}`)}</span>
              </button>`,
          )}
        </div>
        ${
          this._operations === null
            ? html`<p class="muted">${t("loading")}</p>`
            : operations.length === 0
              ? html`<div class="empty inline">
                  <ha-icon icon="mdi:calendar-check-outline"></ha-icon>
                  <p>${t("activity_empty")}</p>
                </div>`
              : groupByDay(operations).map(
                  (group) =>
                    html`<div class="day">
                      <div class="day-label">
                        ${(() => {
                          const name = dayName(group.day, now);
                          return name
                            ? t(name)
                            : new Intl.DateTimeFormat(this.language, {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              }).format(group.day);
                        })()}
                      </div>
                      <ul class="timeline">
                        ${group.operations.map((op) => this.renderOperation(op))}
                      </ul>
                    </div>`,
                )
        }
      </section>
    `;
  }

  private renderOperation(op: Operation) {
    const t = this.t;
    const alert = op.method === "failed" || op.method === "alarm";
    const time = new Intl.DateTimeFormat(this.language, { timeStyle: "short" }).format(op.when);
    const how = [
      alert ? null : t(methodKey(op.method)) + (op.credential ? ` #${op.credential}` : ""),
      op.via === "home_assistant" ? t("via_ha") : null,
      time,
    ].filter(Boolean);
    return html`<li class="op m-${op.method} ${alert ? "alert" : ""}">
      <div class="op-icon">
        <ha-icon icon=${METHOD_ICONS[op.method] ?? METHOD_ICONS.other}></ha-icon>
      </div>
      <div class="grow">
        <div class="op-title">${alert ? t(methodKey(op.method)) : t(actionKey(op.action))}</div>
        <div class="small muted">${how.join(" · ")}</div>
      </div>
      ${op.user ? html`<div class="who">${avatar(op.user, "sm")}<span>${op.user}</span></div>` : nothing}
    </li>`;
  }

  private renderFingerprints() {
    const t = this.t;
    if (!this.safe.admin_key) return nothing;
    const fingerprints = this._list?.fingerprints ?? [];
    return html`
      <section class="card fingerprints">
        <div class="card-header">
          <h2>
            ${t("fingerprints")}
            ${fingerprints.length ? html`<span class="count">${fingerprints.length}</span>` : nothing}
          </h2>
        </div>
        ${
          fingerprints.length === 0
            ? html`<div class="empty inline">
                <ha-icon icon="mdi:fingerprint-off"></ha-icon>
                <p>${t("no_fingerprints")}</p>
              </div>`
            : html`<ul class="fp-grid">
                ${fingerprints.map(
                  (fp) =>
                    html`<li>
                      <ha-icon icon="mdi:fingerprint"></ha-icon>
                      <div>
                        <div class="name">${t("slot", { slot: fp.slot })}</div>
                        <div class="small muted">
                          ${
                            fp.end
                              ? t("until", { when: formatDateTime(fp.end, this.language) })
                              : t("status_permanent")
                          }
                        </div>
                      </div>
                    </li>`,
                )}
              </ul>`
        }
        <p class="muted small note">
          <ha-icon icon="mdi:information-outline"></ha-icon>${t("fingerprints_note")}
        </p>
      </section>
    `;
  }

  static override styles = [
    shared,
    css`
      :host {
        --m-app: #009688;
        --m-keypad: #3f51b5;
        --m-fingerprint: #9c27b0;
        --m-card: #ff9800;
        --m-key: #795548;
        --m-gateway: #607d8b;
        --m-remote: #00bcd4;
        --m-failed: var(--error-color, #db4437);
        --m-alarm: var(--error-color, #db4437);
        --m-other: var(--secondary-text-color);
        --radius: var(--ha-card-border-radius, 16px);
      }
      .layout {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0 auto;
        max-width: 1120px;
        padding: 16px;
      }
      .layout.narrow {
        grid-template-columns: minmax(0, 1fr);
        padding: 8px;
      }
      .wide {
        grid-column: 1 / -1;
      }
      .card {
        animation: rise 0.35s ease both;
        border-radius: var(--radius);
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
      }
      h2 {
        align-items: center;
        display: flex;
        gap: 8px;
      }
      .count {
        background: var(--secondary-background-color);
        border-radius: 10px;
        color: var(--secondary-text-color);
        font-size: 0.75rem;
        font-weight: 500;
        padding: 1px 8px;
      }

      /* Hero */
      .hero {
        --tone: var(--secondary-text-color);
        background:
          radial-gradient(
            120% 140% at 0% 0%,
            color-mix(in srgb, var(--tone) 16%, transparent) 0%,
            transparent 55%
          ),
          var(--ha-card-background, var(--card-background-color, #fff));
        overflow: hidden;
        padding: 20px;
      }
      .tone-locked {
        --tone: var(--state-lock-locked-color, var(--success-color, #43a047));
      }
      .tone-open {
        --tone: var(--state-lock-unlocked-color, var(--error-color, #db4437));
      }
      .tone-gone {
        --tone: var(--disabled-text-color, var(--secondary-text-color));
      }
      .hero-main {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 16px 20px;
      }
      .hero-badge {
        align-items: center;
        background: color-mix(in srgb, var(--tone) 18%, transparent);
        border-radius: 22px;
        color: var(--tone);
        display: flex;
        flex: none;
        height: 72px;
        justify-content: center;
        width: 72px;
      }
      .hero-badge ha-icon {
        --mdc-icon-size: 40px;
      }
      .hero-text {
        display: grid;
        flex: 1 1 240px;
        gap: 4px;
        min-width: 0;
      }
      .eyebrow {
        align-items: center;
        color: var(--secondary-text-color);
        display: flex;
        font-size: 0.8rem;
        font-weight: 500;
        gap: 4px;
        justify-content: space-between;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .eyebrow span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ghost {
        color: var(--secondary-text-color);
        min-height: 32px;
        min-width: 32px;
      }
      .state {
        color: var(--tone);
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .last {
        align-items: center;
        color: var(--secondary-text-color);
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .last ha-icon {
        --mdc-icon-size: 16px;
      }
      .last b {
        color: var(--primary-text-color);
        font-weight: 500;
      }
      .dot {
        opacity: 0.6;
      }
      .action {
        --hold-color: var(--primary-color);
        margin: 0 auto;
      }
      .action.attention {
        --hold-color: var(--tone);
        animation: pulse 2.2s ease-in-out infinite;
        border-radius: 50%;
      }
      @keyframes pulse {
        50% {
          filter: drop-shadow(0 0 12px color-mix(in srgb, var(--tone) 55%, transparent));
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .card,
        .action.attention {
          animation: none;
        }
      }
      .stats {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        margin-top: 18px;
      }
      .stat {
        --c: var(--primary-color);
        align-items: center;
        background: color-mix(
          in srgb,
          var(--c) 9%,
          var(--ha-card-background, var(--card-background-color, #fff))
        );
        border: 1px solid color-mix(in srgb, var(--c) 14%, transparent);
        border-radius: 16px;
        display: flex;
        gap: 12px;
        padding: 12px 14px;
      }
      .stat.ok {
        --c: var(--success-color, #43a047);
      }
      .stat.warn {
        --c: var(--warning-color, #ffa600);
      }
      .stat.bad {
        --c: var(--error-color, #db4437);
      }
      .stat-icon {
        align-items: center;
        background: color-mix(in srgb, var(--c) 20%, transparent);
        border-radius: 50%;
        color: color-mix(in srgb, var(--c) 65%, var(--primary-text-color));
        display: flex;
        flex: none;
        height: 36px;
        justify-content: center;
        width: 36px;
      }
      .stat-body {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .stat-label {
        color: var(--secondary-text-color);
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 1.05rem;
        font-weight: 600;
      }
      .meter {
        background: color-mix(in srgb, var(--c, var(--primary-color)) 18%, transparent);
        border-radius: 3px;
        height: 4px;
        overflow: hidden;
        width: 100%;
      }
      .meter span {
        background: var(--c, var(--primary-color));
        border-radius: 3px;
        display: block;
        height: 100%;
      }
      .bars {
        align-items: flex-end;
        display: flex;
        gap: 2px;
        height: 10px;
      }
      .bars span {
        background: color-mix(in srgb, var(--c) 25%, transparent);
        border-radius: 1px;
        width: 4px;
      }
      .bars span:nth-child(1) {
        height: 4px;
      }
      .bars span:nth-child(2) {
        height: 7px;
      }
      .bars span:nth-child(3) {
        height: 10px;
      }
      .bars span.on {
        background: var(--c);
      }
      button.link {
        border: none;
        color: var(--c);
        font-size: 0.8rem;
        font-weight: 600;
        justify-content: flex-start;
        min-height: 0;
        padding: 0;
      }
      button.link:hover:not([disabled]) {
        background: none;
        text-decoration: underline;
      }

      /* Lists */
      .list {
        display: grid;
        gap: 4px;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .list li {
        align-items: center;
        border-radius: 12px;
        display: flex;
        gap: 12px;
        min-height: 60px;
        padding: 8px;
        transition: background 0.15s ease;
      }
      .list li:hover {
        background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
      }
      .grow {
        display: grid;
        flex: 1;
        gap: 3px;
        grid-template-columns: minmax(0, 1fr);
        min-width: 0;
      }
      .name-row {
        align-items: center;
        display: flex;
        gap: 8px;
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
      .chip {
        flex: none;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      button.code {
        background: var(--secondary-background-color);
        border: none;
        border-radius: 6px;
        color: var(--primary-text-color);
        font-family: var(--ha-font-family-code, monospace);
        font-size: inherit;
        gap: 4px;
        letter-spacing: 0.15em;
        min-height: 0;
        padding: 1px 4px 1px 6px;
        transition:
          background 0.15s ease,
          color 0.15s ease;
      }
      button.code ha-icon {
        --mdc-icon-size: 13px;
        opacity: 0.45;
        transition: opacity 0.15s ease;
      }
      button.code:hover ha-icon,
      button.code:focus-visible ha-icon {
        opacity: 1;
      }
      button.code:hover:not([disabled]) {
        background: color-mix(in srgb, var(--primary-color) 14%, var(--secondary-background-color));
      }
      button.code.copied {
        background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent);
        color: var(--success-color, #43a047);
      }
      button.code.copied ha-icon {
        opacity: 1;
      }
      .passcode.expired .name,
      .passcode.expired .code,
      .passcode.expired .avatar {
        opacity: 0.5;
      }
      .timeleft {
        align-items: center;
        display: flex;
        gap: 8px;
        margin-top: 2px;
      }
      .timeleft .meter {
        --c: var(--success-color, #43a047);
        flex: 0 1 120px;
      }
      .row-actions {
        display: flex;
        flex: none;
      }
      .narrow .row-actions button.icon {
        min-height: 36px;
        min-width: 36px;
      }
      .delete:hover:not([disabled]) {
        color: var(--error-color);
      }
      .used {
        color: var(--secondary-text-color);
      }

      /* Avatars */
      .avatar {
        align-items: center;
        background: hsl(var(--hue) 70% 50% / 0.2);
        border-radius: 50%;
        /* Mixed with the text colour, so it reads on light and dark themes alike. */
        color: color-mix(in srgb, hsl(var(--hue) 65% 48%) 70%, var(--primary-text-color));
        display: flex;
        flex: none;
        font-size: 0.9rem;
        font-weight: 600;
        height: 40px;
        justify-content: center;
        width: 40px;
      }
      .avatar.unnamed {
        background: var(--secondary-background-color);
        color: var(--secondary-text-color);
      }
      .avatar.sm {
        font-size: 0.7rem;
        height: 24px;
        width: 24px;
      }
      .avatar.xs {
        font-size: 0.6rem;
        height: 18px;
        width: 18px;
      }

      /* Activity */
      .filters {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-bottom: 8px;
      }
      .filter {
        --c: var(--primary-color);
        align-items: flex-start;
        border: 1px solid var(--divider-color);
        border-radius: 14px;
        flex-direction: column;
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
        gap: 0;
        justify-content: center;
        min-height: 56px;
        padding: 6px 12px;
      }
      .filter.failed,
      .filter.alarms {
        --c: var(--error-color, #db4437);
      }
      .filter-count {
        font-size: 1.3rem;
        font-weight: 600;
        line-height: 1.2;
      }
      .filter-label {
        color: var(--secondary-text-color);
        text-align: start;
        font-size: 0.75rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
      }
      .filter.selected {
        background: color-mix(in srgb, var(--c) 12%, transparent);
        border-color: color-mix(in srgb, var(--c) 45%, transparent);
      }
      .filter.hot .filter-count,
      .filter.selected .filter-count {
        color: var(--c);
      }
      .day-label {
        color: var(--secondary-text-color);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        margin: 14px 0 4px 4px;
        text-transform: uppercase;
      }
      .timeline {
        list-style: none;
        margin: 0;
        padding: 0;
        position: relative;
      }
      .timeline::before {
        background: var(--divider-color);
        bottom: 24px;
        content: "";
        left: 21px;
        position: absolute;
        top: 24px;
        width: 2px;
      }
      .op {
        align-items: center;
        border-radius: 12px;
        display: flex;
        gap: 12px;
        padding: 6px 4px;
        position: relative;
      }
      .op-icon {
        --c: var(--m-other);
        align-items: center;
        background: color-mix(in srgb, var(--c) 16%, var(--card-background-color, #fff));
        border: 2px solid var(--card-background-color, #fff);
        border-radius: 50%;
        color: var(--c);
        display: flex;
        flex: none;
        height: 36px;
        justify-content: center;
        width: 36px;
        z-index: 1;
      }
      .m-app .op-icon {
        --c: var(--m-app);
      }
      .m-keypad .op-icon {
        --c: var(--m-keypad);
      }
      .m-fingerprint .op-icon {
        --c: var(--m-fingerprint);
      }
      .m-card .op-icon {
        --c: var(--m-card);
      }
      .m-key .op-icon {
        --c: var(--m-key);
      }
      .m-gateway .op-icon {
        --c: var(--m-gateway);
      }
      .m-remote .op-icon {
        --c: var(--m-remote);
      }
      .m-failed .op-icon,
      .m-alarm .op-icon {
        --c: var(--m-failed);
      }
      .op.alert .op-title {
        color: var(--error-color);
      }
      .op-title {
        font-weight: 500;
      }
      .who {
        align-items: center;
        background: var(--secondary-background-color);
        border-radius: 14px;
        display: flex;
        flex: none;
        font-size: 0.8rem;
        font-weight: 500;
        gap: 6px;
        max-width: 45%;
        padding: 3px 10px 3px 3px;
      }
      .who span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Fingerprints */
      .fp-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .fp-grid li {
        align-items: center;
        background: color-mix(
          in srgb,
          var(--m-fingerprint) 8%,
          var(--ha-card-background, var(--card-background-color, #fff))
        );
        border: 1px solid color-mix(in srgb, var(--m-fingerprint) 16%, transparent);
        border-radius: 16px;
        display: flex;
        gap: 10px;
        padding: 10px 12px;
      }
      .fp-grid ha-icon {
        color: color-mix(in srgb, var(--m-fingerprint) 65%, var(--primary-text-color));
      }
      .note {
        align-items: flex-start;
        display: flex;
        gap: 6px;
        margin-bottom: 0;
      }
      .note ha-icon {
        --mdc-icon-size: 16px;
        flex: none;
      }

      /* Empty states */
      .empty {
        align-items: center;
        color: var(--secondary-text-color);
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 24px;
        text-align: center;
      }
      .empty ha-icon {
        --mdc-icon-size: 40px;
        opacity: 0.5;
      }
      .empty p {
        margin: 0;
        max-width: 420px;
      }
      .empty.inline {
        padding: 16px 8px;
      }
    `,
  ];
}

/** A round avatar with a person's initials, in a colour of their own. */
function avatar(name: string, size: "" | "sm" | "xs" = "") {
  return html`<div class="avatar ${size}" style="--hue:${hueFor(name)}" aria-hidden="true">
    ${initials(name)}
  </div>`;
}

function errorText(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

if (!customElements.get("populife-safe")) customElements.define("populife-safe", PopulifeSafeView);
