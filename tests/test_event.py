"""Tests for the operation-log event entity."""

from __future__ import annotations

import datetime as dt
from unittest.mock import MagicMock

from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import LockEvent

from homeassistant.components.event import ATTR_EVENT_TYPE
from homeassistant.components.lock import DOMAIN as LOCK_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_UNLOCK, STATE_UNKNOWN
from homeassistant.core import HomeAssistant

from . import inject, service_info

LOCK_ENTITY = "lock.office_safe"
EVENT_ENTITY = "event.office_safe_operation"


def _log_push(record_id: int) -> LockEvent:
    return LockEvent(
        cmd_echo=0x14,
        status=1,
        data=b"",
        battery=80,
        uid=42,
        record_id=record_id,
        timestamp=dt.datetime(2026, 10, 16, 18, 30, 5),  # noqa: DTZ001 - lock-local time
    )


async def test_operation_log_push_fires_event(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Each new log record pushed while connected fires the event once."""
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).state == STATE_UNKNOWN

    await hass.services.async_call(
        LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY}, blocking=True
    )
    listener = mock_client.add_event_listener.call_args.args[0]

    listener(_log_push(7))
    await hass.async_block_till_done()
    state = hass.states.get(EVENT_ENTITY)
    assert state.state != STATE_UNKNOWN
    assert state.attributes[ATTR_EVENT_TYPE] == "operation"
    assert state.attributes["record_id"] == 7
    assert state.attributes["uid"] == 42
    assert state.attributes["timestamp"] == "2026-10-16T18:30:05"
    first_fired = state.state

    # A repeated record and a plain state push do not fire again.
    listener(_log_push(7))
    listener(LockEvent(cmd_echo=0x14, status=1, data=b"", battery=80))
    await hass.async_block_till_done()
    assert hass.states.get(EVENT_ENTITY).state == first_fired

    listener(LockEvent(cmd_echo=0x14, status=1, data=b"", record_id=8))
    await hass.async_block_till_done()
    state = hass.states.get(EVENT_ENTITY)
    assert state.attributes["record_id"] == 8
    assert state.attributes["timestamp"] is None


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
