"""Buttons for a Populife safe: refresh everything, and sync the clock (admin keys)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, override

from homeassistant.components.button import ButtonEntity
from homeassistant.const import EntityCategory

from .entity import PopulifeEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry

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
        buttons.append(PopulifeSyncTimeButton(coordinator, "sync_time"))
    async_add_entities(buttons)


class PopulifeRefreshButton(PopulifeEntity, ButtonEntity):
    """Read everything the safe reports again: state, device info, clock, settings, log."""

    _attr_translation_key = "refresh"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    @override
    async def async_press(self) -> None:
        """Connect and read everything."""
        await self.coordinator.async_refresh_all()


class PopulifeSyncTimeButton(PopulifeEntity, ButtonEntity):
    """Set the safe's clock, which drifts and stamps every log entry."""

    _attr_translation_key = "sync_time"
    _attr_entity_category = EntityCategory.CONFIG

    @override
    async def async_press(self) -> None:
        """Sync the clock to Home Assistant's local time."""
        drift = await self.coordinator.async_sync_time()
        _LOGGER.debug("%s: clock was off by %+.1f s", self.coordinator.address, drift)
