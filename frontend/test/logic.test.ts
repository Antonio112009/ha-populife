import { describe, expect, it } from "vitest";

import { actionKey, methodKey, translator } from "../src/i18n";
import {
  batteryLevel,
  checkCode,
  checkWindow,
  conflicts,
  defaultWindow,
  lastUsed,
  mask,
  matchesFilter,
  parseOperations,
  passcodeStatus,
  presetWindow,
  relativeTime,
  signalQuality,
  toLocalInput,
} from "../src/logic";
import type { Operation, Passcode } from "../src/types";

const passcode = (start: string | null, end: string | null): Passcode => ({
  name: "Guest",
  code: "1234",
  type: end ? "timed" : "permanent",
  start,
  end,
  on_safe: true,
});

describe("codes", () => {
  it("finds prefix clashes both ways, but not the code itself", () => {
    expect(conflicts("1234", ["12345"])).toBe("12345");
    expect(conflicts("12345", ["1234"])).toBe("1234");
    expect(conflicts("1234", ["1234", "5678"])).toBeNull();
  });

  it("checks a new code", () => {
    expect(checkCode("", [])).toBe("empty");
    expect(checkCode("12a4", [])).toBe("digits");
    expect(checkCode("123", [])).toBe("length");
    expect(checkCode("1234567890", [])).toBe("length");
    expect(checkCode("48291", ["482916"])).toBe("conflict");
    expect(checkCode("7319", ["482916"])).toBeNull();
  });

  it("masks all but the last two digits", () => {
    expect(mask("482916")).toBe("••••16");
    expect(mask("12")).toBe("12");
  });
});

describe("validity window", () => {
  it("needs an end after the start", () => {
    expect(checkWindow("2026-11-07T09:00", "")).toBe("missing_end");
    expect(checkWindow("2026-11-07T09:00", "2026-11-07T08:00")).toBe("end_before_start");
    expect(checkWindow("", "2026-11-07T08:00")).toBeNull();
    expect(checkWindow("2026-11-07T09:00", "2026-11-08T09:00")).toBeNull();
  });

  it("defaults to the next 24 hours from the current minute", () => {
    const now = new Date(2026, 9, 17, 9, 30, 45);
    expect(defaultWindow(now)).toEqual({ start: "2026-10-17T09:30", end: "2026-10-18T09:30" });
    expect(toLocalInput(new Date(2026, 0, 5, 7, 3))).toBe("2026-01-05T07:03");
  });

  it("tells permanent, upcoming, active and expired apart", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(passcodeStatus(passcode(null, null), now)).toBe("permanent");
    expect(passcodeStatus(passcode(null, "2026-10-17T11:00:00Z"), now)).toBe("expired");
    expect(passcodeStatus(passcode("2026-10-18T00:00:00Z", "2026-10-19T00:00:00Z"), now)).toBe(
      "upcoming",
    );
    expect(passcodeStatus(passcode("2026-10-17T00:00:00Z", "2026-10-19T00:00:00Z"), now)).toBe(
      "active",
    );
  });
});

describe("activity", () => {
  it("reads operations from the event history, newest first", () => {
    const history = {
      "event.safe_operation": [
        { s: "unknown", a: { event_types: ["keypad"] } },
        {
          s: "2026-10-17T10:00:00Z",
          a: { event_type: "keypad", action: "unlock", user: "Mama", time: "2026-10-17T10:00:00Z" },
        },
        { s: "2026-10-17T11:00:00Z", a: { event_type: "failed", action: "other" } },
        { s: "not a time" },
      ],
    };
    const operations = parseOperations(history, "event.safe_operation");
    expect(operations.map((op) => [op.method, op.user])).toEqual([
      ["failed", null],
      ["keypad", "Mama"],
    ]);
    expect(parseOperations({}, "event.other")).toEqual([]);
  });

  it("filters by kind", () => {
    const op = (method: string, action: string): Operation => ({
      when: new Date(),
      method,
      action,
      user: null,
      credential: null,
      via: null,
    });
    expect(matchesFilter(op("keypad", "unlock"), "unlocks")).toBe(true);
    expect(matchesFilter(op("keypad", "lock"), "unlocks")).toBe(false);
    expect(matchesFilter(op("failed", "other"), "failed")).toBe(true);
    expect(matchesFilter(op("alarm", "other"), "alarms")).toBe(true);
    expect(matchesFilter(op("app", "lock"), "all")).toBe(true);
  });

  it("says how long ago, in the user's language", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(relativeTime(new Date("2026-10-17T11:55:00Z"), now, "en")).toBe("5 minutes ago");
    expect(relativeTime(new Date("2026-10-16T12:00:00Z"), now, "en")).toBe("yesterday");
    expect(relativeTime(new Date("2026-10-17T11:59:30Z"), now, "ru")).toBe("30 секунд назад");
  });
});

describe("translations", () => {
  it("fills placeholders and falls back to English", () => {
    expect(translator("ru")("slot", { slot: 2 })).toBe("Слот 2");
    expect(translator("de")("unlock")).toBe("Unlock");
    expect(translator("en-GB")("lock")).toBe("Lock");
  });

  it("maps unknown methods and actions to other", () => {
    expect(methodKey("fingerprint")).toBe("method_fingerprint");
    expect(methodKey("teleport")).toBe("method_other");
    expect(actionKey("unlock")).toBe("action_unlock");
    expect(actionKey("dance")).toBe("action_other");
  });
});

describe("presets", () => {
  // Friday 17 October 2026, 14:20:30.
  const friday = new Date(2026, 9, 16, 14, 20, 30);

  it("covers the next 24 hours, today, a week, or nothing for custom", () => {
    expect(presetWindow("24h", friday)).toEqual({
      start: "2026-10-16T14:20",
      end: "2026-10-17T14:20",
    });
    expect(presetWindow("today", friday)?.end).toBe("2026-10-16T23:59");
    expect(presetWindow("week", friday)?.end).toBe("2026-10-23T14:20");
    expect(presetWindow("custom", friday)).toBeNull();
  });

  it("covers the coming weekend, or the rest of the current one", () => {
    expect(presetWindow("weekend", friday)).toEqual({
      start: "2026-10-17T00:00",
      end: "2026-10-18T23:59",
    });
    const saturday = new Date(2026, 9, 17, 10, 0);
    expect(presetWindow("weekend", saturday)).toEqual({
      start: "2026-10-17T10:00",
      end: "2026-10-18T23:59",
    });
    const sunday = new Date(2026, 9, 18, 10, 0);
    expect(presetWindow("weekend", sunday)).toEqual({
      start: "2026-10-18T10:00",
      end: "2026-10-18T23:59",
    });
  });
});

describe("status chips", () => {
  it("grades battery and signal", () => {
    expect([batteryLevel(86), batteryLevel(30), batteryLevel(12)]).toEqual(["ok", "warn", "bad"]);
    expect([signalQuality(-60), signalQuality(-75), signalQuality(-90)]).toEqual([
      "excellent",
      "good",
      "weak",
    ]);
  });

  it("finds when a named code was last used on the keypad", () => {
    const at = (iso: string, user: string | null, method = "keypad"): Operation => ({
      when: new Date(iso),
      method,
      action: "unlock",
      user,
      credential: null,
      via: null,
    });
    const operations = [at("2026-10-17T10:00:00Z", "Mama"), at("2026-10-16T10:00:00Z", "Guest")];
    expect(lastUsed("Guest", operations)?.toISOString()).toBe("2026-10-16T10:00:00.000Z");
    expect(lastUsed("Plumber", operations)).toBeNull();
    expect(lastUsed(null, operations)).toBeNull();
    expect(lastUsed("Anton", [at("2026-10-17T10:00:00Z", "Anton", "app")])).toBeNull();
  });
});
