"""Fixtures for Populife tests."""

from __future__ import annotations

from collections.abc import Generator
import datetime as dt
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import (
    AutoLockLimits,
    DeviceFeatures,
    DeviceInfo,
    DeviceProperties,
    LockFeature,
    LockSound,
)

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from custom_components.populife.const import DOMAIN

from . import ADDRESS, ENTRY_DATA


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Load the integration from custom_components."""


@pytest.fixture(autouse=True)
def auto_enable_bluetooth(enable_bluetooth: None) -> None:
    """Run every test with a mocked Bluetooth adapter."""


@pytest.fixture(autouse=True)
def no_startup_refresh(request: pytest.FixtureRequest) -> Generator[None]:
    """Keep the coordinator from connecting by itself on advertisements.

    Tests about commands and settings count connections and calls, so the
    post-startup refresh and new-record log syncs only run in tests marked
    `startup_refresh`.
    """
    if request.node.get_closest_marker("startup_refresh"):
        yield
        return
    with patch("custom_components.populife.coordinator.PopulifeCoordinator._async_maybe_connect"):
        yield


def _mock_client() -> MagicMock:
    client = MagicMock()
    client.is_connected = False

    async def _connect() -> None:
        client.is_connected = True

    async def _disconnect() -> None:
        client.is_connected = False

    client.connect = AsyncMock(side_effect=_connect)
    client.disconnect = AsyncMock(side_effect=_disconnect)
    client.lock = AsyncMock()
    client.unlock = AsyncMock()
    client.query_state = AsyncMock(return_value=(None, None))
    client.get_auto_lock_limits = AsyncMock(
        return_value=AutoLockLimits(min_allowed=5, max_allowed=900)
    )
    client.get_auto_lock_time = AsyncMock(return_value=30)
    client.set_auto_lock_time = AsyncMock()
    client.get_lock_sound = AsyncMock(return_value=LockSound(enabled=True, volume=None))
    client.set_lock_sound = AsyncMock()
    client.sync_time = AsyncMock(return_value=12.5)
    client.get_device_info = AsyncMock(
        return_value=DeviceInfo(
            manufacturer="Populife",
            model="SN8534-4P-4MM-BELL_PV53",
            serial_number=None,
            hardware_revision="1.3",
            firmware_revision="7.2.20.251111",
            software_revision=None,
        )
    )
    client.get_operation_log = AsyncMock(return_value=[])
    client.add_passcode = AsyncMock()
    client.delete_passcode = AsyncMock()
    client.clear_passcodes = AsyncMock()
    client.get_passcodes = AsyncMock(return_value=[])
    client.get_lock_time = AsyncMock(side_effect=lambda: dt_util.now().replace(tzinfo=None))
    client.get_device_features = AsyncMock(
        return_value=DeviceFeatures(
            mask=(1 << LockFeature.PASSCODE) | (1 << LockFeature.AUTO_LOCK), battery=100
        )
    )
    client.get_device_properties = AsyncMock(
        return_value=DeviceProperties(
            model_variant="SN8534-4P",
            hardware_revision="1.3",
            firmware_version="7.2.20.251111",
            manufacture_date="20250312",
            mac_address=ADDRESS,
            clock_time=dt.datetime(2026, 10, 16, 18, 0),  # noqa: DTZ001 - lock-local time
        )
    )
    client.get_fingerprints = AsyncMock(return_value=[])
    client.set_lock_volume = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    return client


@pytest.fixture
def mock_client() -> Generator[MagicMock]:
    """Patch the BLE client used by the coordinator."""
    client = _mock_client()
    with patch("custom_components.populife.coordinator.TTLockClient") as cls:
        cls.from_ble_device.return_value = client
        cls.lock = lambda c: c.lock()
        cls.unlock = lambda c: c.unlock()
        yield client


@pytest.fixture
def mock_flow_client() -> Generator[MagicMock]:
    """Patch the BLE client the config flow uses to check a manual key."""
    client = _mock_client()
    with patch("custom_components.populife.config_flow.TTLockClient") as cls:
        cls.from_ble_device.return_value = client
        yield client


@pytest.fixture
def config_entry(hass: HomeAssistant) -> MockConfigEntry:
    """Return a config entry for the test safe."""
    entry = MockConfigEntry(domain=DOMAIN, unique_id=ADDRESS, title="Office safe", data=ENTRY_DATA)
    entry.add_to_hass(hass)
    return entry
