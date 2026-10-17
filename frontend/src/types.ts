/** The parts of Home Assistant's frontend `hass` object the panel uses. */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HassUser {
  id: string;
  name: string;
  is_admin: boolean;
}

export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  user?: HassUser;
  language: string;
  locale?: { language: string };
  themes?: { darkMode?: boolean };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ): Promise<unknown>;
}

/** The panel's view of one safe, from `populife/safes`. */
export interface Safe {
  entry_id: string;
  title: string;
  address: string;
  admin_key: boolean;
  can_operate: boolean;
  entities: Partial<Record<SafeEntity, string>>;
}

export type SafeEntity =
  | "lock"
  | "battery"
  | "signal"
  | "clock_drift"
  | "last_unlock"
  | "last_unlock_method"
  | "last_unlocked_by"
  | "fingerprints"
  | "passcodes"
  | "operation"
  | "refresh"
  | "sync_clock"
  | "auto_lock"
  | "lock_sound"
  | "volume";

/** One passcode from `populife/passcodes`; full code, as only allowed users get the list. */
export interface Passcode {
  name: string | null;
  code: string;
  type: string | null;
  start: string | null;
  end: string | null;
  on_safe: boolean;
}

export interface Fingerprint {
  slot: number;
  start: string | null;
  end: string | null;
}

export interface PasscodeList {
  passcodes: Passcode[];
  fingerprints: Fingerprint[];
}

/** One operation read back from the operation event's history. */
export interface Operation {
  when: Date;
  method: string;
  action: string;
  user: string | null;
  credential: string | null;
}
