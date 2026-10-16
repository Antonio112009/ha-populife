"""Bluetooth coordinator for a Populife safe.

State arrives passively: the firmware folds bolt position, battery and a "new log records"
flag into every advertisement, so Home Assistant tracks the safe without holding a
connection. A connection is only opened on demand (commands, the admin settings, the
one-time refresh after startup, and fetching new log records) and is dropped shortly
afterwards to free the adapter or ESPHome proxy slot.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import logging
from time import monotonic
from typing import TYPE_CHECKING, Any, override

from bleak.exc import BleakError
from ttlock_ble import (
    AutoLockLimits,
    KeyboardPwdType,
    LockAdvertisement,
    LockEvent,
    LockState,
    TTLockClient,
    TTLockError,
)

from homeassistant.components import bluetooth
from homeassistant.components.bluetooth.passive_update_coordinator import (
    PassiveBluetoothDataUpdateCoordinator,
)
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import device_registry as dr, issue_registry as ir
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import UNDEFINED
from homeassistant.util import dt as dt_util

from .const import (
    BATTERY_OK_LEVEL,
    DISCONNECT_DELAY_SECONDS,
    DOMAIN,
    KEEP_ALIVE_SECONDS,
    KEY_REJECTED_ERRORS,
    LOG_SYNC_MIN_INTERVAL_SECONDS,
    LOW_BATTERY_LEVEL,
    REFRESH_RETRY_SECONDS,
)
from .operation_log import ACTION_UNLOCK, Operation, describe

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable, Coroutine
    import datetime as dt

    from ttlock_ble import DeviceInfo, LogEntry, PasscodeEntry, VirtualKey

    from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)

type PopulifeConfigEntry = ConfigEntry[PopulifeCoordinator]

STORAGE_VERSION = 1
# add_passcode takes lock-local times as YYMMDDHHmm.
_PASSCODE_TIME_FORMAT = "%y%m%d%H%M"


@dataclass(slots=True)
class PopulifeState:
    """Latest known state of the safe."""

    lock_state: LockState | None = None
    battery: int | None = None
    rssi: int | None = None
    is_dormant: bool = False
    is_locking: bool = False
    is_unlocking: bool = False
    # Admin settings: unknown until read over a connection.
    auto_lock_seconds: int | None = None
    auto_lock_limits: AutoLockLimits | None = None
    lock_sound: bool | None = None
    # From the operation log.
    last_unlock: dt.datetime | None = None
    last_unlock_method: str | None = None


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


def is_key_rejected(err: TTLockError) -> bool:
    """Return True when the safe refused the key itself rather than the command."""
    return str(err).startswith(KEY_REJECTED_ERRORS)


def _aware(value: dt.datetime) -> dt.datetime:
    """Treat a naive time (as the UI's date-time picker sends) as Home Assistant local time."""
    return value if value.tzinfo else value.replace(tzinfo=dt_util.get_default_time_zone())


def _passcode_time(value: dt.datetime) -> str:
    """Format `value` in the safe's local wall-clock time, as passcode commands expect."""
    return dt_util.as_local(value).strftime(_PASSCODE_TIME_FORMAT)


def _passcode_dict(entry: PasscodeEntry) -> dict[str, Any]:
    zone = dt_util.get_default_time_zone()
    return {
        "passcode": entry.passcode,
        "type": entry.pwd_type.name.lower(),
        "start": entry.start_date.replace(tzinfo=zone).isoformat() if entry.start_date else None,
        "end": entry.end_date.replace(tzinfo=zone).isoformat() if entry.end_date else None,
    }


def _order(operation: Operation) -> tuple[str, int]:
    """Sort key for log records: time first, then the safe's record number."""
    assert operation.time is not None
    return (operation.time.isoformat(), operation.record_number)


class PopulifeCoordinator(PassiveBluetoothDataUpdateCoordinator):
    """Track advertisements and run commands for one safe."""

    def __init__(
        self, hass: HomeAssistant, config_entry: PopulifeConfigEntry, key: VirtualKey
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            key.lockMac.upper(),
            bluetooth.BluetoothScanningMode.PASSIVE,
            connectable=True,
        )
        self.config_entry = config_entry
        self.key = key
        # Admin commands need the admin password itself: an owner's cloud key
        # (`is_admin()`) carries it, and a hand-entered key may carry it without
        # the cloud `userType`. Without it the library refuses before connecting.
        self.has_admin = key.adminPs.isdigit()
        self.state = PopulifeState()
        self._client: TTLockClient | None = None
        self._command_lock = asyncio.Lock()
        self._cancel_disconnect: CALLBACK_TYPE | None = None
        self._settings_loaded = False
        self._operation_listeners: list[Callable[[Operation], None]] = []
        # One refresh (state, device info, settings, log) per Home Assistant start. Retries
        # and deferred log syncs run on timers: Home Assistant doesn't deliver repeated,
        # identical advertisements, so the next one may never come.
        self._refreshed = False
        self._refresh_running = False
        self._cancel_refresh_retry: CALLBACK_TYPE | None = None
        self._last_log_sync: float | None = None
        self._log_sync_running = False
        self._cancel_log_sync: CALLBACK_TYPE | None = None
        # The newest log record already turned into events, kept across restarts.
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{config_entry.entry_id}.log"
        )
        self._last_record: tuple[str, int] | None = None

    async def async_load(self) -> None:
        """Load what the coordinator keeps across restarts."""
        if (stored := await self._store.async_load()) and "time" in stored:
            self._last_record = (str(stored["time"]), int(stored["number"]))

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
            self._async_set_battery(advertisement.battery)
            self.state.is_dormant = advertisement.is_dormant
            # A dormant frame clears the bolt bit regardless of the real bolt
            # position, so keep the last trustworthy state instead.
            if advertisement.lock_state is not None and not self._command_lock.locked():
                self.state.lock_state = advertisement.lock_state
            self._async_maybe_connect(has_new_records=advertisement.has_new_records)
        super()._async_handle_bluetooth_event(service_info, change)

    @callback
    def _async_maybe_connect(self, *, has_new_records: bool) -> None:
        """Start the post-startup refresh, or fetch log records the safe flags as new."""
        if not self._refreshed:
            if not self._refresh_running and self._cancel_refresh_retry is None:
                self._async_start_refresh()
            return
        if has_new_records:
            self._async_request_log_sync()

    @callback
    def _async_start_refresh(self) -> None:
        self._refresh_running = True
        self._async_background(self._async_refresh(), "refresh")

    @callback
    def _async_retry_refresh(self, _now: object) -> None:
        self._cancel_refresh_retry = None
        if self.available and not self._refreshed:
            self._async_start_refresh()

    @callback
    def _async_request_log_sync(self) -> None:
        """Sync the log now, or once the minimum interval since the last sync has passed."""
        if self._cancel_log_sync is not None:
            return
        last = self._last_log_sync
        wait = 0.0 if last is None else LOG_SYNC_MIN_INTERVAL_SECONDS - (monotonic() - last)
        if wait <= 0:
            self._async_schedule_log_sync()
            return

        @callback
        def _deferred(_now: object) -> None:
            self._cancel_log_sync = None
            self._async_schedule_log_sync()

        self._cancel_log_sync = async_call_later(self.hass, wait, _deferred)

    @callback
    def _async_background(self, coro: Coroutine[Any, Any, None], name: str) -> None:
        self.config_entry.async_create_background_task(
            self.hass, coro, f"{DOMAIN} {self.address} {name}"
        )

    @callback
    def _async_set_battery(self, battery: int) -> None:
        """Record the battery level and raise or clear the low-battery repair."""
        self.state.battery = battery
        issue_id = f"low_battery_{self.config_entry.entry_id}"
        if battery < LOW_BATTERY_LEVEL:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                issue_id,
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="low_battery",
                translation_placeholders={
                    "name": self.config_entry.title,
                    "battery": str(battery),
                },
            )
        elif battery >= BATTERY_OK_LEVEL:
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)

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
                await self._async_run_locked(command)
                self.state.lock_state = result
            finally:
                self.state.is_locking = self.state.is_unlocking = False
                self.async_update_listeners()
        # The link is still open, so these cost no extra connection.
        if self.has_admin and not self._settings_loaded:
            self._settings_loaded = True
            self._async_background(self._async_load_settings(), "settings")
        self._async_schedule_log_sync()

    async def async_run[T](self, command: Callable[[TTLockClient], Awaitable[T]]) -> T:
        """Run `command` over a connection opened on demand and dropped when idle."""
        async with self._command_lock:
            return await self._async_run_locked(command)

    async def _async_run_locked[T](self, command: Callable[[TTLockClient], Awaitable[T]]) -> T:
        try:
            client = await self._async_get_client()
            result = await command(client)
        except (TTLockError, BleakError, TimeoutError) as err:
            await self._async_disconnect()
            if isinstance(err, TTLockError) and is_key_rejected(err):
                self.config_entry.async_start_reauth(self.hass)
                raise HomeAssistantError(
                    translation_domain=DOMAIN,
                    translation_key="key_rejected",
                    translation_placeholders={"error": str(err)},
                ) from err
            raise HomeAssistantError(
                translation_domain=DOMAIN,
                translation_key="command_failed",
                translation_placeholders={"error": str(err)},
            ) from err
        self._schedule_disconnect()
        return result

    async def _async_refresh(self) -> None:
        """Read state and device info once after startup, then settings and new log records."""

        async def read(
            client: TTLockClient,
        ) -> tuple[tuple[LockState | None, int | None], DeviceInfo]:
            return await client.query_state(), await client.get_device_info()

        try:
            (lock_state, battery), info = await self.async_run(read)
        except HomeAssistantError as err:
            _LOGGER.debug("%s: refresh failed, will retry: %s", self.address, err)
            self._cancel_refresh_retry = async_call_later(
                self.hass, REFRESH_RETRY_SECONDS, self._async_retry_refresh
            )
            return
        finally:
            self._refresh_running = False
        self._refreshed = True
        if lock_state is not None:
            self.state.lock_state = lock_state
        if battery is not None:
            self._async_set_battery(battery)
        self._async_update_device(info)
        self.async_update_listeners()
        if self.has_admin and not self._settings_loaded:
            self._settings_loaded = True
            await self._async_load_settings()
        await self.async_sync_log()

    @callback
    def _async_update_device(self, info: DeviceInfo) -> None:
        """Store model, firmware, hardware and serial number on the device."""
        registry = dr.async_get(self.hass)
        device = registry.async_get_device_by_connection(
            (dr.CONNECTION_BLUETOOTH, self.address), self.config_entry.entry_id
        )
        if device is None:
            return
        registry.async_update_device(
            device.id,
            model=info.model or UNDEFINED,
            sw_version=info.firmware_revision or UNDEFINED,
            hw_version=info.hardware_revision or UNDEFINED,
            serial_number=info.serial_number or UNDEFINED,
        )

    async def async_refresh_auto_lock(self) -> None:
        """Read the auto-lock delay and the range the firmware accepts."""

        async def read(client: TTLockClient) -> tuple[AutoLockLimits, int]:
            return await client.get_auto_lock_limits(), await client.get_auto_lock_time()

        self.state.auto_lock_limits, self.state.auto_lock_seconds = await self.async_run(read)
        self.async_update_listeners()

    async def async_set_auto_lock(self, seconds: int) -> None:
        """Set the auto-lock delay; 0 turns auto-lock off."""
        await self.async_run(lambda client: client.set_auto_lock_time(seconds))
        self.state.auto_lock_seconds = seconds
        self.async_update_listeners()

    async def async_refresh_lock_sound(self) -> None:
        """Read whether the safe beeps."""
        sound = await self.async_run(lambda client: client.get_lock_sound())
        self.state.lock_sound = sound.enabled
        self.async_update_listeners()

    async def async_set_lock_sound(self, *, enabled: bool) -> None:
        """Turn the beep on or off."""
        await self.async_run(lambda client: client.set_lock_sound(enabled=enabled))
        self.state.lock_sound = enabled
        self.async_update_listeners()

    async def async_sync_time(self) -> float:
        """Set the safe's clock to Home Assistant's local time; return the drift it had."""
        return await self.async_run(lambda client: client.sync_time(local_time=dt_util.now()))

    async def _async_load_settings(self) -> None:
        """Read the admin settings once, so the settings entities show a value."""
        for refresh in (self.async_refresh_auto_lock, self.async_refresh_lock_sound):
            try:
                await refresh()
            except HomeAssistantError as err:
                _LOGGER.debug("%s: could not read settings: %s", self.address, err)

    # Operation log

    @callback
    def async_add_operation_listener(self, listener: Callable[[Operation], None]) -> CALLBACK_TYPE:
        """Call `listener` for every new operation-log record; return a remover."""
        self._operation_listeners.append(listener)

        @callback
        def remove() -> None:
            self._operation_listeners.remove(listener)

        return remove

    @callback
    def _async_schedule_log_sync(self) -> None:
        if not self._log_sync_running:
            self._async_background(self.async_sync_log(), "log")

    async def async_sync_log(self) -> None:
        """Fetch log records the safe hasn't reported yet and turn new ones into events."""
        if self._log_sync_running:
            return
        self._log_sync_running = True
        self._last_log_sync = monotonic()
        try:
            entries: list[LogEntry] = await self.async_run(
                lambda client: client.get_operation_log()
            )
        except HomeAssistantError as err:
            _LOGGER.debug("%s: could not read the operation log: %s", self.address, err)
            return
        finally:
            self._log_sync_running = False
        await self._async_process_log(entries)

    async def _async_process_log(self, entries: list[LogEntry]) -> None:
        dated = [op for op in map(describe, entries) if op.time is not None]
        if not dated:
            return
        baseline = self._last_record
        # The first sync ever only sets the starting point: replaying the safe's whole
        # history as events would flood the logbook.
        new = (
            []
            if baseline is None
            else sorted((op for op in dated if _order(op) > baseline), key=_order)
        )
        unlocks = [op for op in (dated if baseline is None else new) if op.action == ACTION_UNLOCK]
        if unlocks:
            latest = max(unlocks, key=_order)
            self.state.last_unlock = latest.time
            self.state.last_unlock_method = latest.method
        for operation in new:
            for listener in list(self._operation_listeners):
                listener(operation)
        newest = _order(max(dated, key=_order))
        if baseline is None or newest > baseline:
            self._last_record = newest
            await self._store.async_save({"time": newest[0], "number": newest[1]})
        self.async_update_listeners()

    # Keypad passcodes (admin)

    def _require_admin(self) -> None:
        if not self.has_admin:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="admin_required"
            )

    async def async_add_passcode(
        self, code: str, start: dt.datetime | None, end: dt.datetime | None
    ) -> None:
        """Add a keypad passcode: permanent, or valid from `start` (default now) to `end`."""
        self._require_admin()
        if end is None:
            await self.async_run(lambda client: client.add_passcode(code))
            return
        begin = _aware(start) if start else dt_util.now()
        end = _aware(end)
        if end <= begin:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="passcode_period_invalid"
            )
        await self.async_run(
            lambda client: client.add_passcode(
                code,
                pwd_type=KeyboardPwdType.PERIOD,
                start_date=_passcode_time(begin),
                end_date=_passcode_time(end),
            )
        )

    async def async_delete_passcode(self, code: str) -> None:
        """Delete a keypad passcode, whether permanent or time-limited."""
        self._require_admin()
        try:
            await self.async_run(lambda client: client.delete_passcode(code))
        except HomeAssistantError:
            await self.async_run(
                lambda client: client.delete_passcode(code, pwd_type=KeyboardPwdType.PERIOD)
            )

    async def async_clear_passcodes(self) -> None:
        """Delete every keypad passcode on the safe."""
        self._require_admin()
        await self.async_run(lambda client: client.clear_passcodes())

    async def async_list_passcodes(self) -> list[dict[str, Any]]:
        """Return the keypad passcodes the safe reports."""
        self._require_admin()
        entries = await self.async_run(lambda client: client.get_passcodes())
        return [_passcode_dict(entry) for entry in entries]

    # Connection

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
        """Apply a push from the open connection (keypad, fingerprint, re-latch, log entry)."""
        _LOGGER.debug("%s: lock event %s", self.address, event)
        if event.battery is not None:
            self._async_set_battery(event.battery)
        if event.lock_state is not None:
            self.state.lock_state = event.lock_state
        if event.record_id is not None:
            # A record was written while connected: read it with its type and time.
            self._async_schedule_log_sync()
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
        for cancel in (self._cancel_disconnect, self._cancel_refresh_retry, self._cancel_log_sync):
            if cancel is not None:
                cancel()
        self._cancel_disconnect = self._cancel_refresh_retry = self._cancel_log_sync = None
        await self._async_disconnect()
