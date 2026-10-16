"""Operation-log event for a Populife safe.

While a connection is open (after a command), the safe pushes each new
operation-log record: keypad, fingerprint, card or app openings.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, override

from homeassistant.components.event import EventEntity
from homeassistant.core import callback

from .entity import PopulifeEntity

if TYPE_CHECKING:
    from ttlock_ble import LockEvent

    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry

PARALLEL_UPDATES = 0

EVENT_OPERATION = "operation"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the operation-log event."""
    async_add_entities([PopulifeOperationEvent(entry.runtime_data, "operation")])


class PopulifeOperationEvent(PopulifeEntity, EventEntity):
    """Fires for each operation-log record the safe pushes."""

    _attr_translation_key = "operation"
    _attr_event_types = [EVENT_OPERATION]  # noqa: RUF012 - Home Assistant's attribute pattern

    @override
    async def async_added_to_hass(self) -> None:
        """Listen for operation-log pushes."""
        await super().async_added_to_hass()
        self.async_on_remove(
            self.coordinator.async_add_operation_listener(self._async_handle_operation)
        )

    @callback
    def _async_handle_operation(self, event: LockEvent) -> None:
        self._trigger_event(
            EVENT_OPERATION,
            {
                "record_id": event.record_id,
                "uid": event.uid,
                # Lock-local wall-clock time; the safe's clock has no timezone.
                "timestamp": event.timestamp.isoformat() if event.timestamp else None,
            },
        )
        self.async_write_ha_state()
