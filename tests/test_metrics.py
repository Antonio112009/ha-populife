"""Tests for the metrics read straight from the safe: clock, counts, volume, details."""

from __future__ import annotations

import datetime as dt
from unittest.mock import MagicMock

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.components.diagnostics import (
    get_diagnostics_for_config_entry,
)
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator
from ttlock_ble import (
    FingerprintEntry,
    KeyboardPwdType,
    LockSound,
    LockVolume,
    PasscodeEntry,
    TTLockError,
)

from homeassistant.components.button import DOMAIN as BUTTON_DOMAIN, SERVICE_PRESS
from homeassistant.components.select import (
    ATTR_OPTION,
    DOMAIN as SELECT_DOMAIN,
    SERVICE_SELECT_OPTION,
)
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.util import dt as dt_util

from custom_components.populife.const import DOMAIN

from . import ADDRESS, inject, make_key, service_info

LOCK_ENTITY = "lock.office_safe"
DRIFT = "sensor.office_safe_clock_drift"
FINGERPRINTS = "sensor.office_safe_fingerprints"
PASSCODES = "sensor.office_safe_passcodes"
VOLUME = "select.office_safe_lock_volume"
REFRESH = "button.office_safe_refresh"


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()


async def _refresh(hass: HomeAssistant) -> None:
    await hass.services.async_call(
        BUTTON_DOMAIN, SERVICE_PRESS, {ATTR_ENTITY_ID: REFRESH}, blocking=True
    )
    await hass.async_block_till_done()


def _fingerprint(slot: int) -> FingerprintEntry:
    return FingerprintEntry(
        fingerprint_id=b"\x01\x02",
        slot=slot,
        start_date=None,
        end_date=dt.datetime(2027, 1, 1, 0, 0),  # noqa: DTZ001 - lock-local time
    )


async def test_refresh_reads_metrics(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
) -> None:
    """The refresh button reads the clock, counts, features and properties."""
    mock_client.get_lock_time.side_effect = lambda: (
        dt_util.now().replace(tzinfo=None) + dt.timedelta(seconds=30)
    )
    mock_client.get_fingerprints.return_value = [_fingerprint(1), _fingerprint(2)]
    mock_client.get_passcodes.return_value = [
        PasscodeEntry(f"{n}1357", KeyboardPwdType.PERMANENT, None, None, None) for n in range(3)
    ]
    await _setup(hass, config_entry)
    await _refresh(hass)

    assert 29 <= float(hass.states.get(DRIFT).state) <= 31
    assert hass.states.get(FINGERPRINTS).state == "2"
    assert hass.states.get(PASSCODES).state == "3"
    device = dr.async_get(hass).async_get_device_by_connection(
        (dr.CONNECTION_BLUETOOTH, ADDRESS), config_entry.entry_id
    )
    assert device is not None
    assert device.model_id == "SN8534-4P"

    diagnostics = await get_diagnostics_for_config_entry(hass, hass_client, config_entry)
    details = diagnostics["details"]
    assert details["features"] == ["passcode", "auto_lock"]
    assert details["properties"]["manufacture_date"] == "20250312"
    assert details["fingerprints"][0]["slot"] == 1
    assert details["fingerprints"][0]["start"] is None
    assert "fingerprint_id" not in str(details)


async def test_refresh_button_reports_unreachable_safe(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Pressing refresh while the safe can't be reached shows the error."""
    await _setup(hass, config_entry)
    mock_client.query_state.side_effect = TTLockError("asleep")
    with pytest.raises(HomeAssistantError, match="did not complete"):
        await _refresh(hass)


async def test_admin_read_failure_keeps_the_rest(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """One admin read failing doesn't stop the others."""
    mock_client.get_device_features.side_effect = TTLockError("not supported")
    mock_client.get_passcodes.return_value = [
        PasscodeEntry("482916", KeyboardPwdType.PERMANENT, None, None, None)
    ]
    await _setup(hass, config_entry)
    await _refresh(hass)
    assert config_entry.runtime_data.details.features is None
    assert hass.states.get(PASSCODES).state == "1"


async def test_sync_clock_resets_drift(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """After syncing, the safe's clock matches Home Assistant's."""
    mock_client.get_lock_time.side_effect = lambda: (
        dt_util.now().replace(tzinfo=None) - dt.timedelta(minutes=5)
    )
    await _setup(hass, config_entry)
    await _refresh(hass)
    assert float(hass.states.get(DRIFT).state) < -290

    await hass.services.async_call(
        BUTTON_DOMAIN,
        SERVICE_PRESS,
        {ATTR_ENTITY_ID: "button.office_safe_sync_clock"},
        blocking=True,
    )
    assert float(hass.states.get(DRIFT).state) == 0


async def test_volume_select_only_with_a_speaker(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    entity_registry: er.EntityRegistry,
) -> None:
    """The volume appears once the safe reports one, and can be changed."""
    await _setup(hass, config_entry)
    await _refresh(hass)
    # The default mock is beeper-only hardware: no volume.
    assert entity_registry.async_get(VOLUME) is None

    mock_client.get_lock_sound.return_value = LockSound(enabled=True, volume=LockVolume.MEDIUM)
    await _refresh(hass)
    assert hass.states.get(VOLUME).state == "medium"

    await hass.services.async_call(
        SELECT_DOMAIN,
        SERVICE_SELECT_OPTION,
        {ATTR_ENTITY_ID: VOLUME, ATTR_OPTION: "high"},
        blocking=True,
    )
    mock_client.set_lock_volume.assert_awaited_once_with(LockVolume.HIGH)
    assert hass.states.get(VOLUME).state == "high"


async def test_list_fingerprints(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Listing returns slots and validity, never the template id."""
    mock_client.get_fingerprints.return_value = [_fingerprint(4)]
    await _setup(hass, config_entry)
    response = await hass.services.async_call(
        DOMAIN,
        "list_fingerprints",
        {ATTR_ENTITY_ID: LOCK_ENTITY},
        blocking=True,
        return_response=True,
    )
    fingerprints = response[LOCK_ENTITY]["fingerprints"]
    assert fingerprints[0]["slot"] == 4
    assert fingerprints[0]["end"].startswith("2027-01-01T00:00:00")
    assert hass.states.get(FINGERPRINTS).state == "1"


async def test_shared_key_gets_no_admin_metrics(
    hass: HomeAssistant, mock_client: MagicMock, entity_registry: er.EntityRegistry
) -> None:
    """Without the admin password only the metrics anyone may read are offered."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=ADDRESS,
        title="Office safe",
        data={"address": ADDRESS, "key": make_key().to_dict()},
    )
    entry.add_to_hass(hass)
    await _setup(hass, entry)
    assert entity_registry.async_get(REFRESH) is not None
    assert entity_registry.async_get(DRIFT) is not None
    for entity_id in (FINGERPRINTS, PASSCODES, VOLUME, "button.office_safe_sync_clock"):
        assert entity_registry.async_get(entity_id) is None

    await _refresh(hass)
    mock_client.get_fingerprints.assert_not_awaited()
