"""Bluetooth coordinator for a Populife safe.

State arrives passively: the firmware folds bolt position and battery into
every advertisement, so Home Assistant tracks the safe without holding a
connection. A connection is only opened for commands (lock / unlock) and is
dropped shortly afterwards to free the adapter or ESPHome proxy slot.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import logging
from typing import TYPE_CHECKING, override

from bleak.exc import BleakError
from ttlock_ble import LockAdvertisement, LockEvent, LockState, TTLockClient, TTLockError

from homeassistant.components import bluetooth
from homeassistant.components.bluetooth.passive_update_coordinator import (
    PassiveBluetoothDataUpdateCoordinator,
)
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_call_later

from .const import DISCONNECT_DELAY_SECONDS, DOMAIN, KEEP_ALIVE_SECONDS

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

    from ttlock_ble import VirtualKey

    from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)

type PopulifeConfigEntry = ConfigEntry[PopulifeCoordinator]


@dataclass(slots=True)
class PopulifeState:
    """Latest known state of the safe."""

    lock_state: LockState | None = None
    battery: int | None = None
    rssi: int | None = None
    is_dormant: bool = False
    is_locking: bool = False
    is_unlocking: bool = False


def parse_advertisement(
    service_info: bluetooth.BluetoothServiceInfoBleak,
) -> LockAdvertisement | None:
    """Return the TTLock advertisement for `service_info`'s own address, if any."""
    address = service_info.address.upper()
    for company_id, payload in service_info.manufacturer_data.items():
        advertisement = LockAdvertisement.from_manufacturer_data(company_id, payload)
        if advertisement is not None and advertisement.lock_mac == address:
            return advertisement
    return None


class PopulifeCoordinator(PassiveBluetoothDataUpdateCoordinator):
    """Track advertisements and run commands for one safe."""

    def __init__(self, hass: HomeAssistant, key: VirtualKey) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            key.lockMac.upper(),
            bluetooth.BluetoothScanningMode.PASSIVE,
            connectable=True,
        )
        self.key = key
        self.state = PopulifeState()
        self._client: TTLockClient | None = None
        self._command_lock = asyncio.Lock()
        self._cancel_disconnect: CALLBACK_TYPE | None = None

    @callback
    @override
    def _async_handle_bluetooth_event(
        self,
        service_info: bluetooth.BluetoothServiceInfoBleak,
        change: bluetooth.BluetoothChange,
    ) -> None:
        """Fold a fresh advertisement into the state."""
        self.state.rssi = service_info.rssi
        if (advertisement := parse_advertisement(service_info)) is not None:
            self.state.battery = advertisement.battery
            self.state.is_dormant = advertisement.is_dormant
            # A dormant frame clears the bolt bit regardless of the real bolt
            # position, so keep the last trustworthy state instead.
            if advertisement.lock_state is not None and not self._command_lock.locked():
                self.state.lock_state = advertisement.lock_state
        super()._async_handle_bluetooth_event(service_info, change)

    async def async_lock(self) -> None:
        """Lock the safe."""
        await self._async_command(TTLockClient.lock, LockState.LOCKED, unlocking=False)

    async def async_unlock(self) -> None:
        """Unlock the safe."""
        await self._async_command(TTLockClient.unlock, LockState.UNLOCKED, unlocking=True)

    async def _async_command(
        self,
        command: Callable[[TTLockClient], Awaitable[None]],
        result: LockState,
        *,
        unlocking: bool,
    ) -> None:
        async with self._command_lock:
            self.state.is_unlocking = unlocking
            self.state.is_locking = not unlocking
            self.async_update_listeners()
            try:
                client = await self._async_get_client()
                await command(client)
            except (TTLockError, BleakError, TimeoutError) as err:
                await self._async_disconnect()
                raise HomeAssistantError(
                    translation_domain=DOMAIN,
                    translation_key="command_failed",
                    translation_placeholders={"error": str(err)},
                ) from err
            else:
                self.state.lock_state = result
                self._schedule_disconnect()
            finally:
                self.state.is_locking = self.state.is_unlocking = False
                self.async_update_listeners()

    async def _async_get_client(self) -> TTLockClient:
        """Reuse the open connection, or connect through the best adapter / proxy."""
        if self._client is not None and self._client.is_connected:
            return self._client
        device = bluetooth.async_ble_device_from_address(self.hass, self.address, connectable=True)
        if device is None:
            raise HomeAssistantError(
                translation_domain=DOMAIN,
                translation_key="device_not_found",
                translation_placeholders={"address": self.address},
            )
        client = TTLockClient.from_ble_device(
            device,
            self.key,
            keep_alive_after_command=KEEP_ALIVE_SECONDS,
        )
        client.add_event_listener(self._async_handle_lock_event)
        await client.connect()
        self._client = client
        return client

    @callback
    def _async_handle_lock_event(self, event: LockEvent) -> None:
        """Apply a state push from the open connection (keypad, fingerprint, re-latch)."""
        _LOGGER.debug("%s: lock event %s", self.address, event)
        if event.battery is not None:
            self.state.battery = event.battery
        if event.lock_state is not None:
            self.state.lock_state = event.lock_state
        self.async_update_listeners()

    @callback
    def _schedule_disconnect(self) -> None:
        if self._cancel_disconnect is not None:
            self._cancel_disconnect()
        self._cancel_disconnect = async_call_later(
            self.hass, DISCONNECT_DELAY_SECONDS, self._async_delayed_disconnect
        )

    async def _async_delayed_disconnect(self, _now: object) -> None:
        self._cancel_disconnect = None
        async with self._command_lock:
            await self._async_disconnect()

    async def _async_disconnect(self) -> None:
        if (client := self._client) is None:
            return
        self._client = None
        client.remove_event_listener(self._async_handle_lock_event)
        try:
            await client.disconnect()
        except TTLockError, BleakError, TimeoutError:
            _LOGGER.debug("%s: error while disconnecting", self.address, exc_info=True)

    async def async_shutdown(self) -> None:
        """Cancel pending work and drop the connection on unload."""
        if self._cancel_disconnect is not None:
            self._cancel_disconnect()
            self._cancel_disconnect = None
        await self._async_disconnect()
