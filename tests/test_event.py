"""Tests for the operation event entity."""

from __future__ import annotations

import datetime as dt
from unittest.mock import MagicMock

from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import LockEvent, LogEntry, LogOperate

from homeassistant.components.event import ATTR_EVENT_TYPE
from homeassistant.components.lock import DOMAIN as LOCK_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_UNLOCK, STATE_UNKNOWN
from homeassistant.core import HomeAssistant

from . import inject, service_info

LOCK_ENTITY = "lock.office_safe"
EVENT_ENTITY = "event.office_safe_operation"


def log_entry(
    number: int, record_type: int, minute: int, *, password: str | None = None
) -> LogEntry:
    """Return a log record written at 18:<minute> lock-local time."""
    return LogEntry(
        record_number=number,
        record_type=record_type,
        operate_date=dt.datetime(2026, 10, 16, 18, minute),  # noqa: DTZ001 - lock-local time
        lock_battery=80,
        password=password,
    )


def _push(record_id: int) -> LockEvent:
    return LockEvent(cmd_echo=0x14, status=1, data=b"", battery=80, uid=42, record_id=record_id)


async def test_new_log_records_fire_typed_events(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A record pushed while connected is read from the log and fired with its method."""
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).state == STATE_UNKNOWN

    # The first sync only records where the history ends.
    mock_client.get_operation_log.return_value = [log_entry(1, LogOperate.MOBILE_UNLOCK, 0)]
    await hass.services.async_call(
        LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).state == STATE_UNKNOWN

    mock_client.get_operation_log.return_value = [
        log_entry(2, LogOperate.KEYBOARD_PASSWORD_UNLOCK, 5, password="482916"),
        log_entry(3, LogOperate.FR_UNLOCK_SUCCEED, 6, password="2"),
    ]
    listener = mock_client.add_event_listener.call_args.args[0]
    listener(_push(3))
    await hass.async_block_till_done()
    state = hass.states.get(EVENT_ENTITY)
    assert state.attributes[ATTR_EVENT_TYPE] == "fingerprint"
    assert state.attributes["action"] == "unlock"
    assert state.attributes["record_type"] == "fr_unlock_succeed"
    assert state.attributes["credential"] == "2"
    assert state.attributes["time"].startswith("2026-10-16T18:06:00")
    first_fired = state.state

    # Already reported records and plain state pushes don't fire again.
    listener(_push(3))
    listener(LockEvent(cmd_echo=0x14, status=1, data=b"", battery=80))
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).state == first_fired


async def test_keypad_codes_never_reach_events(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A keypad record fires without the typed code."""
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()
    coordinator = config_entry.runtime_data
    await coordinator._async_process_log([log_entry(1, LogOperate.MOBILE_UNLOCK, 0)])
    await coordinator._async_process_log(
        [log_entry(2, LogOperate.KEYBOARD_PASSWORD_UNLOCK, 5, password="482916")]
    )
    await hass.async_block_till_done()
    state = hass.states.get(EVENT_ENTITY)
    assert state.attributes[ATTR_EVENT_TYPE] == "keypad"
    assert state.attributes["credential"] is None
    assert "482916" not in str(state.attributes)


async def test_listener_removed_on_unload(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Unloading the entry unregisters the event entity from the coordinator."""
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    coordinator = config_entry.runtime_data
    assert len(coordinator._operation_listeners) == 1

    assert await hass.config_entries.async_unload(config_entry.entry_id)
    assert coordinator._operation_listeners == []
