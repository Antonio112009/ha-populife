"""Fixtures for Populife tests."""

from __future__ import annotations

from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import AutoLockLimits, LockSound

from homeassistant.core import HomeAssistant

from custom_components.populife.const import DOMAIN

from . import ADDRESS, ENTRY_DATA


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Load the integration from custom_components."""


@pytest.fixture(autouse=True)
def auto_enable_bluetooth(enable_bluetooth: None) -> None:
    """Run every test with a mocked Bluetooth adapter."""


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
