/** Pure helpers behind the panel, kept free of DOM and Home Assistant so they're easy to test. */

import type { Operation, Passcode } from "./types";

export const MIN_CODE = 4;
export const MAX_CODE = 9;

export type CodeProblem = "empty" | "digits" | "length" | "conflict";

/** Mirror of the integration's prefix rule: the keypad accepts the first stored match. */
export function conflicts(code: string, others: Iterable<string>): string | null {
  for (const other of others) {
    if (other !== code && (code.startsWith(other) || other.startsWith(code))) return other;
  }
  return null;
}

export function checkCode(code: string, known: Iterable<string>): CodeProblem | null {
  if (code === "") return "empty";
  if (!/^\d+$/.test(code)) return "digits";
  if (code.length < MIN_CODE || code.length > MAX_CODE) return "length";
  return conflicts(code, known) === null ? null : "conflict";
}

export type WindowProblem = "missing_end" | "end_before_start";

export function checkWindow(start: string, end: string): WindowProblem | null {
  if (end === "") return "missing_end";
  if (start !== "" && new Date(end) <= new Date(start)) return "end_before_start";
  return null;
}

export type PasscodeStatus = "permanent" | "upcoming" | "active" | "expired";

export function passcodeStatus(passcode: Passcode, now: Date): PasscodeStatus {
  if (passcode.end === null) return "permanent";
  if (new Date(passcode.end) <= now) return "expired";
  if (passcode.start !== null && new Date(passcode.start) > now) return "upcoming";
  return "active";
}

export function mask(code: string): string {
  return "•".repeat(Math.max(code.length - 2, 0)) + code.slice(-2);
}

/** `<input type="datetime-local">` value for a date, in the browser's local time. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** The next 24 hours, starting at the current minute: the default temporary window. */
export function defaultWindow(now: Date): { start: string; end: string } {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}

export const METHOD_ICONS: Record<string, string> = {
  app: "mdi:cellphone-key",
  keypad: "mdi:dialpad",
  fingerprint: "mdi:fingerprint",
  card: "mdi:card-account-details-outline",
  key: "mdi:key-variant",
  gateway: "mdi:router-wireless",
  remote: "mdi:remote",
  failed: "mdi:alert-circle-outline",
  alarm: "mdi:alarm-light-outline",
  other: "mdi:information-outline",
};

export type ActivityFilter = "all" | "unlocks" | "failed" | "alarms";

export function matchesFilter(operation: Operation, filter: ActivityFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unlocks":
      return operation.action === "unlock";
    case "failed":
      return operation.method === "failed";
    case "alarms":
      return operation.method === "alarm";
  }
}

interface HistoryState {
  s: string;
  a?: Record<string, unknown>;
  lu?: number;
}

const str = (value: unknown): string | null => (typeof value === "string" ? value : null);

/**
 * Operations from `history/history_during_period` for the operation event entity, newest
 * first. Each state change of the event entity is one operation; its attributes say how.
 */
export function parseOperations(
  history: Record<string, HistoryState[] | undefined>,
  entityId: string,
): Operation[] {
  const operations: Operation[] = [];
  let attributes: Record<string, unknown> = {};
  for (const state of history[entityId] ?? []) {
    // The compressed format repeats attributes only when they change.
    if (state.a) attributes = state.a;
    const method = str(attributes.event_type);
    const when = Date.parse(state.s);
    if (method === null || Number.isNaN(when)) continue;
    operations.push({
      when: new Date(str(attributes.time) ?? when),
      method,
      action: str(attributes.action) ?? "other",
      user: str(attributes.user),
      credential: str(attributes.credential),
      via: str(attributes.via),
    });
  }
  return operations.sort((a, b) => b.when.getTime() - a.when.getTime());
}

/** "5 minutes ago" in the user's language. */
export function relativeTime(date: Date, now: Date, language: string): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(seconds, "second");
}

export function formatDateTime(value: string | Date, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export type WindowPreset = "24h" | "today" | "weekend" | "week" | "custom";
export const WINDOW_PRESETS: WindowPreset[] = ["24h", "today", "weekend", "week", "custom"];

/** The window a preset stands for, as datetime-local values; null for "custom". */
export function presetWindow(
  preset: WindowPreset,
  now: Date,
): { start: string; end: string } | null {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const end = new Date(start);
  switch (preset) {
    case "custom":
      return null;
    case "24h":
      end.setDate(end.getDate() + 1);
      break;
    case "today":
      end.setHours(23, 59, 0, 0);
      break;
    case "week":
      end.setDate(end.getDate() + 7);
      break;
    case "weekend": {
      // From Saturday 00:00 (or now, during the weekend) to Sunday 23:59.
      const day = start.getDay();
      const toSaturday = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
      if (day !== 6 && day !== 0) {
        start.setDate(start.getDate() + toSaturday);
        start.setHours(0, 0, 0, 0);
      }
      end.setTime(start.getTime());
      end.setDate(end.getDate() + (start.getDay() === 6 ? 1 : 0));
      end.setHours(23, 59, 0, 0);
      break;
    }
  }
  return { start: toLocalInput(start), end: toLocalInput(end) };
}

export type Level = "ok" | "warn" | "bad";

export function batteryLevel(percent: number): Level {
  if (percent < 20) return "bad";
  if (percent < 40) return "warn";
  return "ok";
}

export type SignalQuality = "excellent" | "good" | "weak";

export function signalQuality(dbm: number): SignalQuality {
  if (dbm >= -65) return "excellent";
  if (dbm >= -80) return "good";
  return "weak";
}

/** When the code with this name last opened the safe, from the activity. */
export function lastUsed(name: string | null, operations: Operation[]): Date | null {
  if (name === null) return null;
  const used = operations.find(
    (op) => op.user === name && op.action === "unlock" && op.method === "keypad",
  );
  return used ? used.when : null;
}
