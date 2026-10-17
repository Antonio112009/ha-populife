/** A fake Home Assistant for developing and testing the panel without a real install. */

import type { HassEntity, HomeAssistant, Passcode, Safe } from "../src/types";

const ENTRY = "01M5340C225ZASYKJ3NSEYHKPZ";
const PREFIX = "s8534_549605";

export const SAFE: Safe = {
  entry_id: ENTRY,
  title: "S8534_549605",
  address: "78:58:44:05:96:54",
  admin_key: true,
  can_operate: true,
  entities: {
    lock: `lock.${PREFIX}`,
    battery: `sensor.${PREFIX}_battery`,
    signal: `sensor.${PREFIX}_signal_strength`,
    clock_drift: `sensor.${PREFIX}_clock_drift`,
    last_unlock: `sensor.${PREFIX}_last_unlock`,
    last_unlock_method: `sensor.${PREFIX}_last_unlock_method`,
    last_unlocked_by: `sensor.${PREFIX}_last_unlocked_by`,
    fingerprints: `sensor.${PREFIX}_fingerprints`,
    passcodes: `sensor.${PREFIX}_passcodes`,
    operation: `event.${PREFIX}_operation`,
    refresh: `button.${PREFIX}_refresh`,
    sync_clock: `button.${PREFIX}_sync_clock`,
  },
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const iso = (date: Date) => date.toISOString();

function entity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  const now = iso(new Date());
  return { entity_id: entityId, state, attributes, last_changed: now, last_updated: now };
}

export interface MockOptions {
  language?: string;
  canOperate?: boolean;
  adminKey?: boolean;
  lockState?: string;
  clockDrift?: number;
}

export function createMockHass(options: MockOptions = {}): HomeAssistant & {
  calls: { domain: string; service: string; data: Record<string, unknown> }[];
} {
  const e = SAFE.entities as Required<Safe["entities"]>;
  const lastUnlock = minutesAgo(38);
  const passcodes: Passcode[] = [
    { name: "Mama", code: "482916", type: "permanent", start: null, end: null, on_safe: true },
    {
      name: "Guest this weekend",
      code: "7319",
      type: "timed",
      start: iso(minutesAgo(60 * 20)),
      end: iso(minutesAgo(-60 * 28)),
      on_safe: true,
    },
    {
      name: "Plumber",
      code: "550281",
      type: "timed",
      start: iso(minutesAgo(60 * 72)),
      end: iso(minutesAgo(60 * 48)),
      on_safe: true,
    },
    {
      name: null,
      code: "2580",
      type: "period",
      start: null,
      end: iso(minutesAgo(-60 * 24 * 30)),
      on_safe: true,
    },
  ];

  const states: Record<string, HassEntity> = {
    [e.lock]: entity(e.lock, options.lockState ?? "locked"),
    [e.battery]: entity(e.battery, "86"),
    [e.signal]: entity(e.signal, "-64"),
    [e.clock_drift]: entity(e.clock_drift, String(options.clockDrift ?? 4.2)),
    [e.last_unlock]: entity(e.last_unlock, iso(lastUnlock)),
    [e.last_unlock_method]: entity(e.last_unlock_method, "keypad"),
    [e.last_unlocked_by]: entity(e.last_unlocked_by, "Mama"),
    [e.fingerprints]: entity(e.fingerprints, "2"),
    [e.passcodes]: entity(e.passcodes, String(passcodes.length)),
    [e.operation]: entity(e.operation, iso(lastUnlock)),
  };

  const operations: [number, string, string, string | null, string | null][] = [
    [38, "keypad", "unlock", "Mama", null],
    [95, "fingerprint", "unlock", null, "2"],
    [180, "failed", "other", null, null],
    [60 * 26, "app", "unlock", null, null],
    [60 * 27, "app", "lock", null, null],
    [60 * 49, "keypad", "unlock", "Guest this weekend", null],
    [60 * 75, "alarm", "other", null, null],
  ];

  const calls: { domain: string; service: string; data: Record<string, unknown> }[] = [];
  const hass = {
    states,
    language: options.language ?? "en",
    locale: { language: options.language ?? "en" },
    user: { id: "u1", name: "Anton", is_admin: true },
    calls,
    async callWS<T>(message: Record<string, unknown>): Promise<T> {
      await new Promise((resolve) => setTimeout(resolve, 150));
      switch (message.type) {
        case "populife/safes":
          return {
            safes: [
              {
                ...SAFE,
                can_operate: options.canOperate ?? true,
                admin_key: options.adminKey ?? true,
              },
            ],
          } as T;
        case "populife/passcodes":
          return {
            passcodes: [...passcodes],
            fingerprints: [
              { slot: 1, start: null, end: null },
              { slot: 2, start: null, end: iso(minutesAgo(-60 * 24 * 90)) },
            ],
          } as T;
        case "populife/generate":
          return { code: String(100000 + Math.floor(Math.random() * 899999)) } as T;
        case "history/history_during_period":
          return {
            [e.operation]: operations.map(([minutes, method, action, user, credential]) => ({
              s: iso(minutesAgo(minutes)),
              lu: minutesAgo(minutes).getTime() / 1000,
              a: { event_type: method, action, user, credential, time: iso(minutesAgo(minutes)) },
            })),
          } as T;
        default:
          throw new Error(`Unexpected command ${String(message.type)}`);
      }
    },
    async callService(domain: string, service: string, data: Record<string, unknown> = {}) {
      calls.push({ domain, service, data });
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (domain === "lock") {
        states[e.lock] = entity(e.lock, service === "unlock" ? "unlocked" : "locked");
      }
      if (domain === "populife" && service === "add_passcode") {
        passcodes.push({
          name: (data.name as string | undefined) ?? null,
          code: data.code as string,
          type: data.end ? "timed" : "permanent",
          start: (data.start as string | undefined) ?? null,
          end: (data.end as string | undefined) ?? null,
          on_safe: true,
        });
      }
      if (domain === "populife" && service === "delete_passcode") {
        passcodes.splice(
          passcodes.findIndex((p) => p.code === data.code),
          1,
        );
      }
      if (domain === "button" && data.entity_id === e.sync_clock) {
        states[e.clock_drift] = entity(e.clock_drift, "0");
      }
      states[e.passcodes] = entity(e.passcodes, String(passcodes.length));
      return {};
    },
  };
  return hass;
}
