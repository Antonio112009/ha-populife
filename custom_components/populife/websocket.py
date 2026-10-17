"""Websocket API for the Populife panel.

The panel reads entity states the usual way and runs commands through the entities' actions,
which check access themselves. These commands add what states can't carry: which entities
belong to which safe, and the full passcodes, which only admins and allowed users may read.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Final

import probatio

from homeassistant.components.websocket_api import async_register_command
from homeassistant.components.websocket_api.const import ERR_NOT_FOUND
from homeassistant.components.websocket_api.decorators import websocket_command
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .access import user_may_operate
from .const import DOMAIN
from .passcodes import generate

if TYPE_CHECKING:
    from homeassistant.components.websocket_api.connection import ActiveConnection

    from .coordinator import PopulifeConfigEntry

# (platform, unique-id key) of every entity the panel shows, by the name it uses for it.
PANEL_ENTITIES: Final = {
    "lock": ("lock", "lock"),
    "battery": ("sensor", "battery"),
    "signal": ("sensor", "rssi"),
    "clock_drift": ("sensor", "clock_drift"),
    "last_unlock": ("sensor", "last_unlock"),
    "last_unlock_method": ("sensor", "last_unlock_method"),
    "last_unlocked_by": ("sensor", "last_unlock_user"),
    "fingerprints": ("sensor", "fingerprints"),
    "passcodes": ("sensor", "passcodes"),
    "operation": ("event", "operation"),
    "refresh": ("button", "refresh"),
    "sync_clock": ("button", "sync_time"),
    "auto_lock": ("number", "auto_lock_delay"),
    "lock_sound": ("switch", "lock_sound"),
    "volume": ("select", "lock_volume"),
}
ERR_NOT_ALLOWED: Final = "not_allowed"


@callback
def async_setup(hass: HomeAssistant) -> None:
    """Register the panel's websocket commands."""
    async_register_command(hass, ws_safes)
    async_register_command(hass, ws_passcodes)
    async_register_command(hass, ws_generate)


def _loaded_entries(hass: HomeAssistant) -> list[PopulifeConfigEntry]:
    return [
        entry
        for entry in hass.config_entries.async_loaded_entries(DOMAIN)
        if getattr(entry, "runtime_data", None) is not None
    ]


@websocket_command({probatio.Required("type"): f"{DOMAIN}/safes"})
@callback
def ws_safes(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]) -> None:
    """List the safes with their entities and what the calling user may do."""
    registry = er.async_get(hass)
    safes = []
    for entry in _loaded_entries(hass):
        coordinator = entry.runtime_data
        entities = {
            name: entity_id
            for name, (platform, key) in PANEL_ENTITIES.items()
            if (
                entity_id := registry.async_get_entity_id(
                    platform, DOMAIN, f"{coordinator.address}_{key}"
                )
            )
        }
        safes.append(
            {
                "entry_id": entry.entry_id,
                "title": entry.title,
                "address": coordinator.address,
                "admin_key": coordinator.has_admin,
                "can_operate": user_may_operate(entry, connection.user),
                "entities": entities,
            }
        )
    connection.send_result(msg["id"], {"safes": safes})


def _entry_for(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> PopulifeConfigEntry | None:
    """Return the requested safe's entry, or send an error and return None."""
    entry = next((e for e in _loaded_entries(hass) if e.entry_id == msg["entry_id"]), None)
    if entry is None:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "No such safe")
        return None
    if not user_may_operate(entry, connection.user):
        connection.send_error(msg["id"], ERR_NOT_ALLOWED, "You may not operate this safe")
        return None
    return entry


@websocket_command(
    {probatio.Required("type"): f"{DOMAIN}/passcodes", probatio.Required("entry_id"): str}
)
@callback
def ws_passcodes(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]) -> None:
    """Return the full passcode list and fingerprint slots, for those who may operate."""
    if (entry := _entry_for(hass, connection, msg)) is None:
        return
    coordinator = entry.runtime_data
    connection.send_result(
        msg["id"],
        {
            "passcodes": coordinator.passcode_overview(),
            "fingerprints": coordinator.details.fingerprints,
        },
    )


@websocket_command(
    {probatio.Required("type"): f"{DOMAIN}/generate", probatio.Required("entry_id"): str}
)
@callback
def ws_generate(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]) -> None:
    """Return a random 6-digit code that clashes with no known code."""
    if (entry := _entry_for(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"code": generate(entry.runtime_data.known_codes())})
