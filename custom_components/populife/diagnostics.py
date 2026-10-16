"""Diagnostics support for Populife."""

from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, Any

from homeassistant.components.diagnostics import async_redact_data

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import PopulifeConfigEntry

# Anything that would let someone open the safe.
TO_REDACT = {"aesKeyStr", "unlockKey", "adminPs", "uid"}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: PopulifeConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    coordinator = entry.runtime_data
    return {
        "entry": async_redact_data(dict(entry.data), TO_REDACT),
        "available": coordinator.available,
        "state": asdict(coordinator.state),
    }
