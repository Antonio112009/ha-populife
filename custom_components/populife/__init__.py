"""The Populife integration: local Bluetooth control of Populife (TTLock-based) safes."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

from ttlock_ble import VirtualKey

from homeassistant.const import Platform

from .const import CONF_KEY
from .coordinator import PopulifeConfigEntry, PopulifeCoordinator

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

PLATFORMS: list[Platform] = [Platform.LOCK, Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: PopulifeConfigEntry) -> bool:
    """Set up a Populife safe from a config entry."""
    key = VirtualKey.from_dict(cast("dict[str, Any]", entry.data[CONF_KEY]))
    coordinator = PopulifeCoordinator(hass, key)
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # Start listening only once the entities exist, so the first advertisement
    # reaches them.
    entry.async_on_unload(coordinator.async_start())
    return True


async def async_unload_entry(hass: HomeAssistant, entry: PopulifeConfigEntry) -> bool:
    """Unload a config entry."""
    if unloaded := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        await entry.runtime_data.async_shutdown()
    return unloaded
