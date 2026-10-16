"""Lock sound setting for a Populife safe (admin keys only)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, override

from homeassistant.components.switch import SwitchEntity
from homeassistant.const import EntityCategory

from .entity import PopulifeEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry

# Commands run one at a time through the coordinator's lock.
PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the lock sound switch when the key can change settings."""
    if entry.runtime_data.has_admin:
        async_add_entities([PopulifeLockSoundSwitch(entry.runtime_data, "lock_sound")])


class PopulifeLockSoundSwitch(PopulifeEntity, SwitchEntity):
    """Whether the keypad and bolt beep."""

    _attr_translation_key = "lock_sound"
    _attr_entity_category = EntityCategory.CONFIG

    @property
    @override
    def is_on(self) -> bool | None:
        """Return True when the safe beeps, None until it has been read."""
        return self.coordinator.state.lock_sound

    @override
    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn the beep on."""
        await self.coordinator.async_set_lock_sound(enabled=True)

    @override
    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn the beep off."""
        await self.coordinator.async_set_lock_sound(enabled=False)

    @override
    async def async_update(self) -> None:
        """Read the setting from the safe (on demand, via `homeassistant.update_entity`)."""
        await self.coordinator.async_refresh_lock_sound()
