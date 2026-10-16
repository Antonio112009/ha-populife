"""Tests for Populife setup, entities and diagnostics."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch

from bleak.exc import BleakError
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed
from pytest_homeassistant_custom_component.components.diagnostics import (
    get_diagnostics_for_config_entry,
)
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator
from ttlock_ble import LockEvent, LockState, TTLockError

from homeassistant.components.lock import DOMAIN as LOCK_DOMAIN, LockState as HALockState
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_LOCK, SERVICE_UNLOCK, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from custom_components.populife.const import DISCONNECT_DELAY_SECONDS

from . import FLAG_DORMANT, FLAG_UNLOCKED, inject, service_info

LOCK_ENTITY = "lock.office_safe"
BATTERY_ENTITY = "sensor.office_safe_battery"
RSSI_ENTITY = "sensor.office_safe_signal_strength"


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


async def _advertise(hass: HomeAssistant, **kwargs: int) -> None:
    inject(hass, service_info(**kwargs))
    await hass.async_block_till_done()


async def _call(hass: HomeAssistant, service: str) -> None:
    await hass.services.async_call(
        LOCK_DOMAIN, service, {ATTR_ENTITY_ID: LOCK_ENTITY}, blocking=True
    )


async def test_state_from_advertisements(
    hass: HomeAssistant, config_entry: MockConfigEntry, entity_registry: er.EntityRegistry
) -> None:
    """Bolt and battery follow the advertisements; dormant frames are not trusted."""
    await _setup(hass, config_entry)
    assert config_entry.state is ConfigEntryState.LOADED
    assert hass.states.get(LOCK_ENTITY).state == STATE_UNAVAILABLE

    await _advertise(hass, flags=0, battery=87)
    assert hass.states.get(LOCK_ENTITY).state == HALockState.LOCKED
    assert hass.states.get(BATTERY_ENTITY).state == "87"

    await _advertise(hass, flags=FLAG_UNLOCKED, battery=86)
    assert hass.states.get(LOCK_ENTITY).state == HALockState.UNLOCKED
    assert hass.states.get(BATTERY_ENTITY).state == "86"

    # Dormant frames clear the bolt bit; the safe is still unlocked.
    await _advertise(hass, flags=FLAG_DORMANT, battery=86)
    assert hass.states.get(LOCK_ENTITY).state == HALockState.UNLOCKED

    rssi = entity_registry.async_get(RSSI_ENTITY)
    assert rssi is not None
    assert rssi.disabled_by is er.RegistryEntryDisabler.INTEGRATION


async def test_unlock_and_lock(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Commands reuse one connection, which is dropped after a quiet period."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)

    await _call(hass, SERVICE_UNLOCK)
    mock_client.unlock.assert_awaited_once()
    assert hass.states.get(LOCK_ENTITY).state == HALockState.UNLOCKED

    await _call(hass, SERVICE_LOCK)
    mock_client.lock.assert_awaited_once()
    mock_client.connect.assert_awaited_once()
    assert hass.states.get(LOCK_ENTITY).state == HALockState.LOCKED

    async_fire_time_changed(
        hass, dt_util.utcnow() + timedelta(seconds=DISCONNECT_DELAY_SECONDS + 1)
    )
    await hass.async_block_till_done()
    mock_client.disconnect.assert_awaited_once()


async def test_events_from_open_connection(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Pushes received while connected update the state."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    await _call(hass, SERVICE_UNLOCK)

    listener = mock_client.add_event_listener.call_args.args[0]
    listener(LockEvent(cmd_echo=0x14, status=1, data=b"", battery=50, lock_state=LockState.LOCKED))
    await hass.async_block_till_done()
    assert hass.states.get(LOCK_ENTITY).state == HALockState.LOCKED
    assert hass.states.get(BATTERY_ENTITY).state == "50"

    listener(LockEvent(cmd_echo=0x01, status=1, data=b"\x00"))
    await hass.async_block_till_done()
    assert hass.states.get(LOCK_ENTITY).state == HALockState.LOCKED


@pytest.mark.parametrize("error", [TTLockError("rejected"), BleakError("gone"), TimeoutError()])
async def test_command_failure(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, error: Exception
) -> None:
    """A failed command raises, keeps the old state and drops the connection."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    mock_client.unlock.side_effect = error

    with pytest.raises(HomeAssistantError, match="did not complete"):
        await _call(hass, SERVICE_UNLOCK)
    assert hass.states.get(LOCK_ENTITY).state == HALockState.LOCKED
    mock_client.disconnect.assert_awaited_once()


async def test_disconnect_error_is_swallowed(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Errors while tearing the link down do not surface."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    await _call(hass, SERVICE_UNLOCK)
    mock_client.disconnect.side_effect = BleakError("already gone")

    assert await hass.config_entries.async_unload(config_entry.entry_id)
    mock_client.disconnect.assert_awaited_once()


async def test_device_not_reachable(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Without a connectable adapter in range the command fails clearly."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    with (
        patch(
            "custom_components.populife.coordinator.bluetooth.async_ble_device_from_address",
            return_value=None,
        ),
        pytest.raises(HomeAssistantError, match="No connectable Bluetooth adapter"),
    ):
        await _call(hass, SERVICE_UNLOCK)
    mock_client.connect.assert_not_awaited()


async def test_unload_drops_connection(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Unloading cancels the pending disconnect and closes the link right away."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    await _call(hass, SERVICE_UNLOCK)

    assert await hass.config_entries.async_unload(config_entry.entry_id)
    assert config_entry.state is ConfigEntryState.NOT_LOADED
    mock_client.disconnect.assert_awaited_once()


async def test_diagnostics_redacts_secrets(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    config_entry: MockConfigEntry,
) -> None:
    """Diagnostics never contain the key material."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0, battery=70)

    diagnostics = await get_diagnostics_for_config_entry(hass, hass_client, config_entry)
    key = diagnostics["entry"]["key"]
    for field in ("aesKeyStr", "unlockKey", "adminPs", "uid"):
        assert key[field] == "**REDACTED**"
    assert diagnostics["state"]["battery"] == 70
    assert diagnostics["available"] is True
