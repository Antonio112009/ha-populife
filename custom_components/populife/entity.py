"""Base entity for Populife."""

from __future__ import annotations

import logging

from homeassistant.auth.permissions.const import POLICY_CONTROL
from homeassistant.components.bluetooth.passive_update_coordinator import (
    PassiveBluetoothCoordinatorEntity,
)
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers.device_registry import CONNECTION_BLUETOOTH, DeviceInfo

from .const import CONF_ALLOWED_USERS, EVENT_ACCESS_DENIED, MANUFACTURER
from .coordinator import PopulifeCoordinator

_LOGGER = logging.getLogger(__name__)


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

    async def async_check_access(self) -> None:
        """Refuse the running action unless an admin or an allowed user started it.

        Home Assistant lets every user operate every entity, so the safe checks for itself.
        Actions with no user behind them (automations, Home Assistant itself) pass, and so do
        admins and the users picked in the options. Anyone else gets Unauthorized, and an
        access denied event is fired.
        """
        context = self._context
        if context is None or context.user_id is None:
            return
        user = await self.hass.auth.async_get_user(context.user_id)
        allowed: list[str] = self.coordinator.config_entry.options.get(CONF_ALLOWED_USERS, [])
        if user is not None and (user.is_admin or user.id in allowed):
            return
        name = user.name if user is not None else None
        _LOGGER.warning(
            "%s: refused %s for %s, who may not operate the safe",
            self.coordinator.address,
            self.entity_id,
            name or context.user_id,
        )
        self.hass.bus.async_fire(
            EVENT_ACCESS_DENIED,
            {"entity_id": self.entity_id, "user_id": context.user_id, "name": name},
            context=context,
        )
        raise Unauthorized(
            context=context,
            user_id=context.user_id,
            entity_id=self.entity_id,
            permission=POLICY_CONTROL,
        )
