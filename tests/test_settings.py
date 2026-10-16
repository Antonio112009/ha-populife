"""Tests for the admin settings entities and for key rejection."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

from bleak.exc import BleakError
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import TTLockError

from homeassistant.components.button import DOMAIN as BUTTON_DOMAIN, SERVICE_PRESS
from homeassistant.components.homeassistant import DOMAIN as HA_DOMAIN, SERVICE_UPDATE_ENTITY
from homeassistant.components.lock import DOMAIN as LOCK_DOMAIN
from homeassistant.components.number import (
    ATTR_MAX,
    ATTR_VALUE,
    DOMAIN as NUMBER_DOMAIN,
    SERVICE_SET_VALUE,
)
from homeassistant.components.switch import DOMAIN as SWITCH_DOMAIN
from homeassistant.config_entries import SOURCE_REAUTH
from homeassistant.const import (
    ATTR_ENTITY_ID,
    SERVICE_TURN_OFF,
    SERVICE_TURN_ON,
    SERVICE_UNLOCK,
    STATE_OFF,
    STATE_ON,
    STATE_UNKNOWN,
)
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component

from custom_components.populife.const import CONF_KEY, DOMAIN

from . import ADDRESS, ENTRY_DATA, inject, make_key, service_info

LOCK_ENTITY = "lock.office_safe"
AUTO_LOCK_ENTITY = "number.office_safe_auto_lock_delay"
SOUND_ENTITY = "switch.office_safe_lock_sound"
SYNC_ENTITY = "button.office_safe_sync_clock"


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()


async def _call(hass: HomeAssistant, domain: str, service: str, data: dict[str, Any]) -> None:
    await hass.services.async_call(domain, service, data, blocking=True)
    await hass.async_block_till_done()


async def test_admin_entities_only_for_admin_keys(
    hass: HomeAssistant, entity_registry: er.EntityRegistry
) -> None:
    """A key without the admin password gets no settings entities."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=ADDRESS,
        title="Office safe",
        data={**ENTRY_DATA, CONF_KEY: make_key().to_dict()},
    )
    entry.add_to_hass(hass)
    await _setup(hass, entry)

    for entity_id in (AUTO_LOCK_ENTITY, SOUND_ENTITY, SYNC_ENTITY):
        assert entity_registry.async_get(entity_id) is None
    assert hass.states.get(LOCK_ENTITY) is not None


async def test_settings_read_after_first_command(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Settings are unknown until a command opens the link, then read once over it."""
    await _setup(hass, config_entry)
    assert hass.states.get(AUTO_LOCK_ENTITY).state == STATE_UNKNOWN
    assert hass.states.get(SOUND_ENTITY).state == STATE_UNKNOWN
    mock_client.connect.assert_not_awaited()

    await _call(hass, LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY})
    state = hass.states.get(AUTO_LOCK_ENTITY)
    assert state.state == "30"
    assert state.attributes[ATTR_MAX] == 900
    assert hass.states.get(SOUND_ENTITY).state == STATE_ON
    mock_client.connect.assert_awaited_once()

    # Only the first command reads them.
    await _call(hass, LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY})
    mock_client.get_auto_lock_time.assert_awaited_once()
    mock_client.get_lock_sound.assert_awaited_once()


async def test_settings_read_failure_is_quiet(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A setting the firmware will not report stays unknown; the others still load."""
    mock_client.get_lock_sound.side_effect = TTLockError("Failed to get_lock_sound: short")
    await _setup(hass, config_entry)

    await _call(hass, LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY})
    assert hass.states.get(AUTO_LOCK_ENTITY).state == "30"
    assert hass.states.get(SOUND_ENTITY).state == STATE_UNKNOWN
    assert not hass.config_entries.flow.async_progress()


async def test_update_entity_reads_on_demand(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """`homeassistant.update_entity` reads a setting and then lets the link drop."""
    await _setup(hass, config_entry)
    await async_setup_component(hass, HA_DOMAIN, {})
    mock_client.get_lock_sound.return_value = MagicMock(enabled=False)

    await _call(
        hass,
        HA_DOMAIN,
        SERVICE_UPDATE_ENTITY,
        {ATTR_ENTITY_ID: [AUTO_LOCK_ENTITY, SOUND_ENTITY]},
    )
    assert hass.states.get(AUTO_LOCK_ENTITY).state == "30"
    assert hass.states.get(SOUND_ENTITY).state == STATE_OFF
    mock_client.connect.assert_awaited_once()


async def test_set_auto_lock_delay(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """The delay is written to the safe; 0 turns auto-lock off."""
    await _setup(hass, config_entry)

    await _call(
        hass, NUMBER_DOMAIN, SERVICE_SET_VALUE, {ATTR_ENTITY_ID: AUTO_LOCK_ENTITY, ATTR_VALUE: 0}
    )
    mock_client.set_auto_lock_time.assert_awaited_once_with(0)
    assert hass.states.get(AUTO_LOCK_ENTITY).state == "0"

    await _call(
        hass, NUMBER_DOMAIN, SERVICE_SET_VALUE, {ATTR_ENTITY_ID: AUTO_LOCK_ENTITY, ATTR_VALUE: 2}
    )
    mock_client.set_auto_lock_time.assert_awaited_with(2)


async def test_auto_lock_delay_below_firmware_minimum(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Once the limits are known, a too-short delay is refused before connecting."""
    await _setup(hass, config_entry)
    await _call(hass, LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY})

    with pytest.raises(ServiceValidationError, match="at least 5 seconds"):
        await _call(
            hass,
            NUMBER_DOMAIN,
            SERVICE_SET_VALUE,
            {ATTR_ENTITY_ID: AUTO_LOCK_ENTITY, ATTR_VALUE: 2},
        )
    mock_client.set_auto_lock_time.assert_not_awaited()


async def test_lock_sound_switch(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """The switch writes the beep setting."""
    await _setup(hass, config_entry)

    await _call(hass, SWITCH_DOMAIN, SERVICE_TURN_OFF, {ATTR_ENTITY_ID: SOUND_ENTITY})
    mock_client.set_lock_sound.assert_awaited_once_with(enabled=False)
    assert hass.states.get(SOUND_ENTITY).state == STATE_OFF

    await _call(hass, SWITCH_DOMAIN, SERVICE_TURN_ON, {ATTR_ENTITY_ID: SOUND_ENTITY})
    mock_client.set_lock_sound.assert_awaited_with(enabled=True)
    assert hass.states.get(SOUND_ENTITY).state == STATE_ON


async def test_sync_clock_button(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """The button syncs the safe's clock to Home Assistant's local time."""
    await hass.config.async_set_time_zone("Europe/Berlin")
    await _setup(hass, config_entry)

    await _call(hass, BUTTON_DOMAIN, SERVICE_PRESS, {ATTR_ENTITY_ID: SYNC_ENTITY})
    local_time = mock_client.sync_time.await_args.kwargs["local_time"]
    assert str(local_time.tzinfo) == "Europe/Berlin"


@pytest.mark.parametrize(
    "message",
    [
        "Failed to validate virtual key with lock: checkUserTime FAILED",
        "Failed to authorize as admin: checkAdmin FAILED",
        "Failed to check_random: lock rejected with status=0x0, error=00",
        "Failed to decrypt unlock response: Padding is incorrect.",
    ],
)
async def test_rejected_key_starts_reauth(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, message: str
) -> None:
    """A key the safe refuses raises a clear error and asks for a new key."""
    await _setup(hass, config_entry)
    mock_client.unlock.side_effect = TTLockError(message)

    with pytest.raises(HomeAssistantError, match="rejected the Bluetooth key"):
        await _call(hass, LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY})
    flows = hass.config_entries.flow.async_progress()
    assert len(flows) == 1
    assert flows[0]["context"]["source"] == SOURCE_REAUTH
    mock_client.disconnect.assert_awaited_once()


@pytest.mark.parametrize(
    "error",
    [TTLockError("Failed to set_lock_sound: lock rejected with status=0x0"), BleakError("gone")],
)
async def test_failed_setting_does_not_start_reauth(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock, error: Exception
) -> None:
    """Other failures surface as command errors without a reauth flow."""
    await _setup(hass, config_entry)
    mock_client.set_lock_sound.side_effect = error

    with pytest.raises(HomeAssistantError, match="did not complete"):
        await _call(hass, SWITCH_DOMAIN, SERVICE_TURN_ON, {ATTR_ENTITY_ID: SOUND_ENTITY})
    assert hass.states.get(SOUND_ENTITY).state == STATE_UNKNOWN
    assert not hass.config_entries.flow.async_progress()
