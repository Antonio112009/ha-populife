"""Beep volume for Populife safes with a speaker (admin keys only)."""

from __future__ import annotations

from typing import TYPE_CHECKING, override

from ttlock_ble import LockVolume

from homeassistant.components.select import SelectEntity
from homeassistant.const import EntityCategory
from homeassistant.core import callback

from .entity import PopulifeEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry

# Commands run one at a time through the coordinator's lock.
PARALLEL_UPDATES = 0

OPTIONS = [volume.name.lower() for volume in LockVolume]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add the volume select once the safe reports a volume.

    Safes with a plain beeper report none, and setting one would be a silent no-op, so the
    entity only appears for safes that have the setting.
    """
    coordinator = entry.runtime_data
    if not coordinator.has_admin:
        return
    added = False

    @callback
    def _async_add_when_supported() -> None:
        nonlocal added
        if not added and coordinator.state.lock_volume is not None:
            added = True
            async_add_entities([PopulifeVolumeSelect(coordinator, "lock_volume")])

    _async_add_when_supported()
    entry.async_on_unload(coordinator.async_add_listener(_async_add_when_supported))


class PopulifeVolumeSelect(PopulifeEntity, SelectEntity):
    """How loud the keypad and bolt beep."""

    _attr_translation_key = "lock_volume"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_options = OPTIONS

    @property
    @override
    def current_option(self) -> str | None:
        """Return the volume level, None until it has been read."""
        volume = self.coordinator.state.lock_volume
        return volume.name.lower() if volume is not None else None

    @override
    async def async_select_option(self, option: str) -> None:
        """Set the volume."""
        await self.coordinator.async_set_lock_volume(LockVolume[option.upper()])
