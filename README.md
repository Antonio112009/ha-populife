# Populife for Home Assistant

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![CI](https://github.com/arredvault/ha-populife/actions/workflows/ci.yml/badge.svg)](https://github.com/arredvault/ha-populife/actions/workflows/ci.yml)
[![Validate](https://github.com/arredvault/ha-populife/actions/workflows/validate.yml/badge.svg)](https://github.com/arredvault/ha-populife/actions/workflows/validate.yml)

Local Bluetooth control of Populife smart safes from Home Assistant. Populife hardware runs
Sciener/TTLock firmware, so this integration speaks the TTLock BLE V3 protocol through
[`ttlock-ble`](https://github.com/roquerodrigo/ttlock-ble). There is no cloud and no gateway:
Home Assistant talks to the safe directly.

## What you get

| Entity | Description |
| --- | --- |
| `lock.<safe>` | Lock / unlock the safe. State is read passively from the safe's advertisements. |
| `sensor.<safe>_battery` | Battery level (diagnostic). |
| `sensor.<safe>_signal_strength` | RSSI (diagnostic, disabled by default). |
| `event.<safe>_operation` | Fires for each operation-log record (keypad, fingerprint, card, app) the safe pushes while connected. |

With an admin key (the owner's key from the cloud, or a manual key with the Bluetooth admin
password) you also get these settings:

| Entity | Description |
| --- | --- |
| `number.<safe>_auto_lock_delay` | Seconds before the safe re-locks by itself; 0 turns auto-lock off. |
| `switch.<safe>_lock_sound` | Keypad and bolt beep. |
| `button.<safe>_sync_clock` | Set the safe's clock to Home Assistant's local time. |

The settings are read over the connection opened by the first lock / unlock command, and on
demand with `homeassistant.update_entity`; until then they show as unknown.

## Requirements

- Home Assistant **2026.10** or newer (Python 3.14).
- A Bluetooth adapter Home Assistant can use: a built-in or USB adapter, or an
  [ESPHome Bluetooth proxy](https://esphome.io/components/bluetooth_proxy/) near the safe.
  To control a safe from another room, place a proxy within a few metres of it.
- The safe's Bluetooth key (see below).

## Installation

1. In HACS, open **⋮ → Custom repositories**, add `https://github.com/arredvault/ha-populife`
   with type **Integration**, and install **Populife**.
2. Restart Home Assistant.
3. Touch the safe's keypad to wake it. Home Assistant discovers it automatically, or you can
   go to **Settings → Devices & services → Add integration → Populife**.

## Getting the key

Each safe has an AES key and an unlock key that the official app creates when the safe is
paired. The integration offers two ways to provide them:

- **Import from a TTLock-family account.** Sign in once. Home Assistant downloads the key for
  this safe, keeps the key, and discards your password. If the account has not been used
  from this install before, the cloud emails a verification code first. This works for
  accounts on the shared TTLock servers; a Populife-only account may not be accepted. In
  that case use the manual option.
- **Enter it manually.** Paste the AES key (16 hex bytes) and the numeric unlock key.
  Home Assistant connects once to check the AES key before saving.

If the safe later rejects the key (for example because it was revoked or the safe was
reset), Home Assistant asks you to re-authenticate and replace it the same two ways. To swap
the key yourself, for example to add the admin password, use **Reconfigure** on the entry.

Treat the key like the safe's PIN: anyone who has it can open the safe. Diagnostics downloads
redact it.

## How it works

- **State** comes from the safe's BLE advertisements, so nothing stays connected. The safe's
  firmware clears the bolt bit when it goes dormant, so dormant frames are ignored and the
  last real state is kept.
- **Commands** (including the settings above) open a connection through whichever adapter or proxy has the best signal, run,
  and then disconnect after 15 seconds of inactivity to free the proxy slot.

## Development

```bash
uv sync
uv run pre-commit install
uv run pytest
```

CI runs ruff (all rules), mypy (strict), pytest with a 90% coverage floor, hassfest, HACS
validation and CodeQL. Releases come from
[release-please](https://github.com/googleapis/release-please). Merge the release PR it opens
and the `populife.zip` that HACS installs is attached to the GitHub release.

## Disclaimer

This project is not affiliated with Populife, Sciener or TTLock. The protocol is
reverse-engineered and a firmware update could break it.
