"""The Populife integration: local Bluetooth control of Populife (TTLock-based) safes."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

from ttlock_ble import VirtualKey

from homeassistant.const import Platform
from homeassistant.helpers import config_validation as cv
from homeassistant.loader import async_get_integration

from . import websocket
from .const import CONF_KEY, DOMAIN
from .coordinator import PopulifeConfigEntry, PopulifeCoordinator
from .panel import async_add_panel, async_register_static, async_remove_panel

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.typing import ConfigType

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

PLATFORMS: list[Platform] = [
    Platform.BUTTON,
    Platform.DATETIME,
    Platform.EVENT,
    Platform.LOCK,
    Platform.NUMBER,
    Platform.SELECT,
    Platform.SENSOR,
    Platform.SWITCH,
    Platform.TEXT,
]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the panel's websocket API and serve its JavaScript."""
    websocket.async_setup(hass)
    await async_register_static(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: PopulifeConfigEntry) -> bool:
    """Set up a Populife safe from a config entry."""
    key = VirtualKey.from_dict(cast("dict[str, Any]", entry.data[CONF_KEY]))
    coordinator = PopulifeCoordinator(hass, entry, key)
    await coordinator.async_load()
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # Start listening only once the entities exist, so the first advertisement
    # reaches them.
    entry.async_on_unload(coordinator.async_start())
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    integration = await async_get_integration(hass, DOMAIN)
    await async_add_panel(hass, str(integration.version))
    return True


async def _async_options_updated(hass: HomeAssistant, entry: PopulifeConfigEntry) -> None:
    """Show or mask the passcodes at once when the options change."""
    entry.runtime_data.async_update_listeners()


async def async_unload_entry(hass: HomeAssistant, entry: PopulifeConfigEntry) -> bool:
    """Unload a config entry."""
    if unloaded := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        await entry.runtime_data.async_shutdown()
        if not [
            other
            for other in hass.config_entries.async_loaded_entries(DOMAIN)
            if other.entry_id != entry.entry_id
        ]:
            async_remove_panel(hass)
    return unloaded
