"""Base entity for Populife."""

from __future__ import annotations

from homeassistant.components.bluetooth.passive_update_coordinator import (
    PassiveBluetoothCoordinatorEntity,
)
from homeassistant.helpers.device_registry import CONNECTION_BLUETOOTH, DeviceInfo

from .const import MANUFACTURER
from .coordinator import PopulifeCoordinator


class PopulifeEntity(PassiveBluetoothCoordinatorEntity[PopulifeCoordinator]):
    """An entity attached to one safe."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: PopulifeCoordinator, key: str) -> None:
        """Initialize the entity; `key` makes the unique id distinct per platform."""
        super().__init__(coordinator)
        lock = coordinator.key
        self._attr_unique_id = f"{coordinator.address}_{key}"
        self._attr_device_info = DeviceInfo(
            connections={(CONNECTION_BLUETOOTH, coordinator.address)},
            manufacturer=MANUFACTURER,
            model=lock.lockName or None,
            name=lock.lockAlias or lock.lockName or f"Populife {coordinator.address[-5:]}",
        )
