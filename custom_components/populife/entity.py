"""Base entity for Populife."""

from __future__ import annotations

from homeassistant.components.bluetooth.passive_update_coordinator import (
    PassiveBluetoothCoordinatorEntity,
)
from homeassistant.helpers.device_registry import CONNECTION_BLUETOOTH, DeviceInfo

from .access import async_check_access
from .const import AUTOMATION, MANUFACTURER
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

    async def async_actor(self) -> str | None:
        """Return who started the running action: a user's name, or "Automation".

        None when Home Assistant itself acts without a user or an automation behind it.
        """
        context = self._context
        if context is None:
            return None
        if context.user_id is not None:
            user = await self.hass.auth.async_get_user(context.user_id)
            return user.name if user is not None and user.name else None
        return AUTOMATION if context.parent_id is not None else None

    async def async_check_access(self) -> None:
        """Refuse the running action unless no user, an admin or an allowed user started it."""
        await async_check_access(
            self.hass, self.coordinator.config_entry, self._context, self.entity_id
        )
