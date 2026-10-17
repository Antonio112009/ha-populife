"""Passcode console fields: when a temporary passcode starts and stops working (admin keys)."""

from __future__ import annotations

from typing import TYPE_CHECKING, override

from homeassistant.components.datetime import DateTimeEntity
from homeassistant.const import EntityCategory
from homeassistant.util import dt as dt_util

from .entity import PopulifeEntity

if TYPE_CHECKING:
    import datetime as dt

    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry, PopulifeCoordinator

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the console's validity fields."""
    coordinator = entry.runtime_data
    if coordinator.has_admin:
        async_add_entities(
            [
                PopulifeValidityDateTime(coordinator, "passcode_start", "start"),
                PopulifeValidityDateTime(coordinator, "passcode_end", "end"),
            ]
        )


class PopulifeValidityDateTime(PopulifeEntity, DateTimeEntity):
    """The start or end of a temporary passcode's window."""

    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator: PopulifeCoordinator, key: str, field: str) -> None:
        """Initialize the field; `field` is "start" or "end" of the draft."""
        super().__init__(coordinator, key)
        self._attr_translation_key = key
        self._field = field

    @property
    @override
    def native_value(self) -> dt.datetime | None:
        """Return the time in the form."""
        value: dt.datetime | None = getattr(self.coordinator.draft, self._field)
        return value

    @override
    async def async_set_value(self, value: dt.datetime) -> None:
        """Set the time; the picker works in Home Assistant's time zone."""
        await self.async_check_access()
        self.coordinator.async_update_draft(**{self._field: dt_util.as_local(value)})
