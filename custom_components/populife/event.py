"""Operation event for a Populife safe.

Each new record in the safe's operation log (keypad, fingerprint, card, app, mechanical key,
failed attempts, alarms) fires an event typed by how the safe was operated. Records are read
whenever Home Assistant connects, including when the safe advertises that it has new ones,
so operations that happened while Home Assistant was away still show up.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, override

from homeassistant.components.event import EventEntity
from homeassistant.core import callback

from .entity import PopulifeEntity
from .operation_log import METHODS

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry
    from .operation_log import Operation

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the operation event."""
    async_add_entities([PopulifeOperationEvent(entry.runtime_data, "operation")])


class PopulifeOperationEvent(PopulifeEntity, EventEntity):
    """Fires for each new operation-log record."""

    _attr_translation_key = "operation"
    _attr_event_types = list(METHODS)  # noqa: RUF012 - Home Assistant's attribute pattern

    @override
    async def async_added_to_hass(self) -> None:
        """Listen for new operation-log records."""
        await super().async_added_to_hass()
        self.async_on_remove(
            self.coordinator.async_add_operation_listener(self._async_handle_operation)
        )

    @callback
    def _async_handle_operation(self, operation: Operation) -> None:
        self._trigger_event(operation.method, operation.as_event_data())
        self.async_write_ha_state()
