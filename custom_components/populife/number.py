"""Auto-lock delay setting for a Populife safe (admin keys only)."""

from __future__ import annotations

from typing import TYPE_CHECKING, override

from homeassistant.components.number import NumberDeviceClass, NumberEntity, NumberMode
from homeassistant.const import EntityCategory, UnitOfTime
from homeassistant.exceptions import ServiceValidationError

from .const import DEFAULT_AUTO_LOCK_MAX_SECONDS, DOMAIN
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
    """Set up the auto-lock delay when the key can change settings."""
    if entry.runtime_data.has_admin:
        async_add_entities([PopulifeAutoLockNumber(entry.runtime_data, "auto_lock_delay")])


class PopulifeAutoLockNumber(PopulifeEntity, NumberEntity):
    """How long the safe waits before re-locking by itself; 0 turns it off."""

    _attr_translation_key = "auto_lock_delay"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_device_class = NumberDeviceClass.DURATION
    _attr_native_unit_of_measurement = UnitOfTime.SECONDS
    _attr_mode = NumberMode.BOX
    _attr_native_min_value = 0
    _attr_native_step = 1

    @property
    @override
    def native_max_value(self) -> float:
        """Return the longest delay the firmware accepts."""
        if (limits := self.coordinator.state.auto_lock_limits) is None:
            return DEFAULT_AUTO_LOCK_MAX_SECONDS
        return limits.max_allowed

    @property
    @override
    def native_value(self) -> int | None:
        """Return the delay in seconds, None until it has been read."""
        return self.coordinator.state.auto_lock_seconds

    @override
    async def async_set_native_value(self, value: float) -> None:
        """Set the delay on the safe."""
        seconds = int(value)
        limits = self.coordinator.state.auto_lock_limits
        # 0 (off) sits outside the firmware's range and is always accepted.
        if limits is not None and 0 < seconds < limits.min_allowed:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="auto_lock_too_short",
                translation_placeholders={"min": str(limits.min_allowed)},
            )
        await self.coordinator.async_set_auto_lock(seconds)

    @override
    async def async_update(self) -> None:
        """Read the delay from the safe (on demand, via `homeassistant.update_entity`)."""
        await self.coordinator.async_refresh_auto_lock()
