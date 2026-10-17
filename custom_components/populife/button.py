"""Buttons for a Populife safe.

Refresh reads everything again. With an admin key there are also the clock sync and the
passcode console's actions: generate a code, add the passcode, delete the picked one.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, override

from homeassistant.components.button import ButtonEntity
from homeassistant.const import EntityCategory

from .entity import PopulifeEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry, PopulifeCoordinator

_LOGGER = logging.getLogger(__name__)

# Commands run one at a time through the coordinator's lock.
PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the refresh button, and the clock sync button when the key can change settings."""
    coordinator = entry.runtime_data
    buttons: list[ButtonEntity] = [PopulifeRefreshButton(coordinator, "refresh")]
    if coordinator.has_admin:
        buttons += [
            PopulifeSyncTimeButton(coordinator, "sync_time"),
            PopulifeConsoleButton(coordinator, "passcode_generate"),
            PopulifeConsoleButton(coordinator, "passcode_add"),
            PopulifeConsoleButton(coordinator, "passcode_delete_selected"),
        ]
    async_add_entities(buttons)


class PopulifeRefreshButton(PopulifeEntity, ButtonEntity):
    """Read everything the safe reports again: state, device info, clock, settings, log."""

    _attr_translation_key = "refresh"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    @override
    async def async_press(self) -> None:
        """Connect and read everything."""
        await self.async_check_access()
        await self.coordinator.async_refresh_all()


class PopulifeSyncTimeButton(PopulifeEntity, ButtonEntity):
    """Set the safe's clock, which drifts and stamps every log entry."""

    _attr_translation_key = "sync_time"
    _attr_entity_category = EntityCategory.CONFIG

    @override
    async def async_press(self) -> None:
        """Sync the clock to Home Assistant's local time."""
        await self.async_check_access()
        drift = await self.coordinator.async_sync_time()
        _LOGGER.debug("%s: clock was off by %+.1f s", self.coordinator.address, drift)


class PopulifeConsoleButton(PopulifeEntity, ButtonEntity):
    """A passcode console action: generate a code, add the passcode, delete the picked one."""

    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator: PopulifeCoordinator, key: str) -> None:
        """Initialize the button; `key` picks the action."""
        super().__init__(coordinator, key)
        self._attr_translation_key = self._action = key

    @override
    async def async_press(self) -> None:
        """Run the action."""
        await self.async_check_access()
        match self._action:
            case "passcode_generate":
                self.coordinator.async_generate_code()
            case "passcode_add":
                await self.coordinator.async_add_draft()
            case _:
                await self.coordinator.async_delete_draft()
