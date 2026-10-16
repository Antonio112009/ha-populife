"""Passcode console fields: the name and the code of the passcode to add (admin keys)."""

from __future__ import annotations

from typing import TYPE_CHECKING, override

from homeassistant.components.text import TextEntity, TextMode
from homeassistant.const import EntityCategory

from .entity import PopulifeEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the console's text fields."""
    coordinator = entry.runtime_data
    if coordinator.has_admin:
        async_add_entities(
            [
                PopulifePasscodeNameText(coordinator, "passcode_name"),
                PopulifePasscodeCodeText(coordinator, "passcode_code"),
            ]
        )


class PopulifeConsoleText(PopulifeEntity, TextEntity):
    """A field of the passcode console's form."""

    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min = 0


class PopulifePasscodeNameText(PopulifeConsoleText):
    """Who a permanent code belongs to, or what a temporary one is for."""

    _attr_translation_key = "passcode_name"
    _attr_native_max = 60

    @property
    @override
    def native_value(self) -> str:
        """Return the name in the form."""
        return self.coordinator.draft.name

    @override
    async def async_set_value(self, value: str) -> None:
        """Set the name."""
        self.coordinator.async_update_draft(name=value)


class PopulifePasscodeCodeText(PopulifeConsoleText):
    """The digits of the passcode to add; empty, or 4 to 9 digits."""

    _attr_translation_key = "passcode_code"
    _attr_mode = TextMode.TEXT
    _attr_native_max = 9
    _attr_pattern = r"^(\d{4,9})?$"

    @property
    @override
    def native_value(self) -> str:
        """Return the code in the form."""
        return self.coordinator.draft.code

    @override
    async def async_set_value(self, value: str) -> None:
        """Set the code."""
        self.coordinator.async_update_draft(code=value)
