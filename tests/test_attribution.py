"""Tests for naming the Home Assistant user behind an unlock or lock Home Assistant sent."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from pytest_homeassistant_custom_component.common import MockConfigEntry, MockUser
from ttlock_ble import LogOperate

from homeassistant.components.lock import DOMAIN as LOCK_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_LOCK, SERVICE_UNLOCK
from homeassistant.core import Context, HomeAssistant

from custom_components.populife.const import ATTRIBUTION_WINDOW_SECONDS

from . import inject, service_info
from .test_event import log_entry

LOCK_ENTITY = "lock.office_safe"
EVENT_ENTITY = "event.office_safe_operation"
LAST_USER = "sensor.office_safe_last_unlocked_by"
MONOTONIC = "custom_components.populife.coordinator.monotonic"


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()


async def _call(hass: HomeAssistant, service: str, context: Context) -> None:
    await hass.services.async_call(
        LOCK_DOMAIN, service, {ATTR_ENTITY_ID: LOCK_ENTITY}, blocking=True, context=context
    )
    await hass.async_block_till_done()


async def test_unlock_names_the_user(
    hass: HomeAssistant,
    hass_admin_user: MockUser,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
) -> None:
    """The safe logs Home Assistant's unlock as an app unlock; Home Assistant names who."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator._async_process_log([log_entry(1, LogOperate.MOBILE_UNLOCK, 0)])

    await _call(hass, SERVICE_UNLOCK, Context(user_id=hass_admin_user.id))
    # Known at once, before the safe's log is read.
    assert hass.states.get(LAST_USER).state == hass_admin_user.name

    await coordinator._async_process_log(
        [
            log_entry(2, LogOperate.KEYBOARD_PASSWORD_UNLOCK, 4, password="999999"),
            log_entry(3, LogOperate.MOBILE_UNLOCK, 5),
        ]
    )
    await hass.async_block_till_done()
    event = hass.states.get(EVENT_ENTITY)
    assert event.attributes["event_type"] == "app"
    assert event.attributes["user"] == hass_admin_user.name
    assert event.attributes["via"] == "home_assistant"
    assert hass.states.get(LAST_USER).state == hass_admin_user.name

    # Each command names one record only.
    await coordinator._async_process_log([log_entry(4, LogOperate.MOBILE_UNLOCK, 6)])
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).attributes["user"] is None


async def test_lock_and_automation(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A lock sent by an automation is attributed to "Automation"."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator._async_process_log([log_entry(1, LogOperate.MOBILE_UNLOCK, 0)])

    await _call(hass, SERVICE_LOCK, Context(parent_id="01AUTOMATIONCONTEXT"))
    await coordinator._async_process_log([log_entry(2, LogOperate.OPERATE_BLE_LOCK, 3)])
    await hass.async_block_till_done()
    event = hass.states.get(EVENT_ENTITY)
    assert (event.attributes["action"], event.attributes["user"]) == ("lock", "Automation")


async def test_no_user_no_name(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A command with no user and no automation behind it names nobody."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator._async_process_log([log_entry(1, LogOperate.MOBILE_UNLOCK, 0)])
    await _call(hass, SERVICE_UNLOCK, Context())
    await coordinator._async_process_log([log_entry(2, LogOperate.MOBILE_UNLOCK, 3)])
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).attributes["user"] is None


async def test_attribution_expires(
    hass: HomeAssistant,
    hass_admin_user: MockUser,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
) -> None:
    """A record read long after the command isn't attributed to it."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator._async_process_log([log_entry(1, LogOperate.MOBILE_UNLOCK, 0)])
    with patch(MONOTONIC, return_value=1000.0):
        await _call(hass, SERVICE_UNLOCK, Context(user_id=hass_admin_user.id))
    with patch(MONOTONIC, return_value=1000.0 + ATTRIBUTION_WINDOW_SECONDS + 1):
        await coordinator._async_process_log([log_entry(2, LogOperate.MOBILE_UNLOCK, 3)])
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).attributes["user"] is None
