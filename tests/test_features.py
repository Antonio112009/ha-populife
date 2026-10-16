"""Tests for the startup refresh, device info, operation log, low battery and passcodes."""

from __future__ import annotations

import datetime as dt
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    mock_restore_cache_with_extra_data,
)
from ttlock_ble import KeyboardPwdType, LockState, LogEntry, LogOperate, PasscodeEntry, TTLockError

from homeassistant.components.lock import DOMAIN as LOCK_DOMAIN, LockState as HALockState
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_UNLOCK
from homeassistant.core import HomeAssistant, State
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import device_registry as dr, issue_registry as ir
from homeassistant.util import dt as dt_util

from custom_components.populife.const import (
    DOMAIN,
    LOG_SYNC_MIN_INTERVAL_SECONDS,
    REFRESH_RETRY_SECONDS,
)
from custom_components.populife.operation_log import describe

from . import ADDRESS, FLAG_NEW_RECORDS, inject, make_key, service_info
from .test_event import log_entry

LOCK_ENTITY = "lock.office_safe"
LAST_UNLOCK = "sensor.office_safe_last_unlock"
LAST_METHOD = "sensor.office_safe_last_unlock_method"
MONOTONIC = "custom_components.populife.coordinator.monotonic"


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


async def _advertise(hass: HomeAssistant, **kwargs: int) -> None:
    inject(hass, service_info(**kwargs))
    await hass.async_block_till_done()


async def _passcode(hass: HomeAssistant, service: str, **data: Any) -> Any:
    return await hass.services.async_call(
        DOMAIN,
        service,
        {ATTR_ENTITY_ID: LOCK_ENTITY, **data},
        blocking=True,
        return_response=service == "list_passcodes",
    )


@pytest.mark.startup_refresh
async def test_startup_refresh(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """The first advertisement after startup reads state, device info, settings and the log."""
    mock_client.query_state.return_value = (LockState.LOCKED, 90)
    mock_client.get_operation_log.return_value = [
        log_entry(1, LogOperate.KEYBOARD_PASSWORD_UNLOCK, 0, password="111111"),
        log_entry(2, LogOperate.PASSCODE_LOCK, 1),
    ]
    await _setup(hass, config_entry)
    # A dormant frame carries no bolt state; the refresh asks the safe instead.
    await _advertise(hass, flags=0x10, battery=95)

    assert hass.states.get(LOCK_ENTITY).state == HALockState.LOCKED
    assert hass.states.get("sensor.office_safe_battery").state == "90"
    device = dr.async_get(hass).async_get_device_by_connection(
        (dr.CONNECTION_BLUETOOTH, ADDRESS), config_entry.entry_id
    )
    assert device is not None
    assert device.model == "SN8534-4P-4MM-BELL_PV53"
    assert device.sw_version == "7.2.20.251111"
    assert device.hw_version == "1.3"
    assert device.serial_number is None
    mock_client.get_auto_lock_time.assert_awaited_once()
    # The history sets the last unlock but replays no events.
    assert hass.states.get(LAST_METHOD).state == "keypad"
    # 18:00 on the safe is local (America/Los_Angeles in tests) and shown in UTC.
    assert hass.states.get(LAST_UNLOCK).state == "2026-10-17T01:00:00+00:00"
    assert hass.states.get("event.office_safe_operation").state == "unknown"

    # Later advertisements don't refresh again.
    await _advertise(hass, flags=0)
    mock_client.query_state.assert_awaited_once()


@pytest.mark.startup_refresh
async def test_startup_refresh_retries(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """An unreachable safe is tried again on a timer, not on every advertisement."""
    mock_client.query_state.side_effect = TTLockError("asleep")
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0, battery=80)
    await _advertise(hass, flags=0, battery=81)
    assert mock_client.query_state.await_count == 1

    mock_client.query_state.side_effect = None
    mock_client.query_state.return_value = (LockState.UNLOCKED, 81)
    # The safe keeps advertising meanwhile, so it stays available and connectable.
    with (
        patch.object(type(config_entry.runtime_data), "available", new=True),
        patch(
            "custom_components.populife.coordinator.bluetooth.async_ble_device_from_address",
            return_value=MagicMock(),
        ),
    ):
        async_fire_time_changed(
            hass, dt_util.utcnow() + dt.timedelta(seconds=REFRESH_RETRY_SECONDS + 1)
        )
        await hass.async_block_till_done()
    assert mock_client.query_state.await_count == 2
    assert config_entry.runtime_data.state.lock_state is LockState.UNLOCKED


@pytest.mark.startup_refresh
async def test_refresh_retry_skipped_when_gone(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """The retry waits for the safe to be heard again if it went out of range."""
    mock_client.query_state.side_effect = TTLockError("asleep")
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    with patch.object(type(config_entry.runtime_data), "available", new=False):
        async_fire_time_changed(
            hass, dt_util.utcnow() + dt.timedelta(seconds=REFRESH_RETRY_SECONDS + 1)
        )
        await hass.async_block_till_done()
    assert mock_client.query_state.await_count == 1
    # The next advertisement starts it again.
    await _advertise(hass, flags=0, battery=50)
    assert mock_client.query_state.await_count == 2


@pytest.mark.startup_refresh
async def test_new_records_flag_syncs_log(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A "new records" advertisement fetches them, deferring to keep one sync a minute."""
    clock = [1000.0]
    with patch(MONOTONIC, side_effect=lambda: clock[0]):
        await _setup(hass, config_entry)
        await _advertise(hass, flags=0)
        assert mock_client.get_operation_log.await_count == 1
        # Too soon after the refresh's sync: deferred, and only once.
        await _advertise(hass, flags=FLAG_NEW_RECORDS)
        await _advertise(hass, flags=FLAG_NEW_RECORDS, battery=86)
        assert mock_client.get_operation_log.await_count == 1
        clock[0] += LOG_SYNC_MIN_INTERVAL_SECONDS
        async_fire_time_changed(
            hass, dt_util.utcnow() + dt.timedelta(seconds=LOG_SYNC_MIN_INTERVAL_SECONDS + 1)
        )
        await hass.async_block_till_done()
        assert mock_client.get_operation_log.await_count == 2

        clock[0] += 1000
        await _advertise(hass, flags=0, battery=85)
        assert mock_client.get_operation_log.await_count == 2
        await _advertise(hass, flags=FLAG_NEW_RECORDS, battery=84)
        assert mock_client.get_operation_log.await_count == 3


async def test_log_sync_failure_is_quiet(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A failing log read after a command is only logged."""
    mock_client.get_operation_log.side_effect = TTLockError("busy")
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    await hass.services.async_call(
        LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(LOCK_ENTITY).state == HALockState.UNLOCKED


async def test_log_baseline_survives_restart(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
) -> None:
    """Records reported before a restart don't fire again; newer ones do."""
    hass_storage[f"{DOMAIN}.{config_entry.entry_id}.log"] = {
        "version": 1,
        "key": f"{DOMAIN}.{config_entry.entry_id}.log",
        "data": {"time": "2026-10-16T18:05:00-07:00", "number": 5},
    }
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    fired: list[str] = []
    config_entry.runtime_data.async_add_operation_listener(lambda op: fired.append(op.method))

    await config_entry.runtime_data._async_process_log(
        [
            log_entry(5, LogOperate.MOBILE_UNLOCK, 5),
            log_entry(6, LogOperate.IC_UNLOCK_SUCCEED, 7, password="A1B2"),
            log_entry(7, LogOperate.ERROR_PASSWORD_UNLOCK, 8),
        ]
    )
    assert fired == ["card", "failed"]
    assert hass.states.get(LAST_METHOD).state == "card"
    assert hass_storage[f"{DOMAIN}.{config_entry.entry_id}.log"]["data"]["number"] == 7


async def test_log_without_dates_is_ignored(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Records whose date the firmware garbled can't be ordered and are skipped."""
    await _setup(hass, config_entry)
    entry = LogEntry(record_number=1, record_type=1, operate_date=None, lock_battery=50)
    await config_entry.runtime_data._async_process_log([entry])
    assert config_entry.runtime_data._last_record is None


async def test_last_unlock_restored(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """The last unlock survives a restart even before the log is read again."""
    when = dt.datetime(2026, 10, 1, 9, 30, tzinfo=dt.UTC)
    mock_restore_cache_with_extra_data(
        hass,
        [
            (
                State(LAST_UNLOCK, when.isoformat()),
                {
                    "native_value": {
                        "__type": "<class 'datetime.datetime'>",
                        "isoformat": when.isoformat(),
                    },
                    "native_unit_of_measurement": None,
                },
            ),
            (
                State(LAST_METHOD, "fingerprint"),
                {"native_value": "fingerprint", "native_unit_of_measurement": None},
            ),
        ],
    )
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    assert config_entry.runtime_data.state.last_unlock == when
    assert hass.states.get(LAST_METHOD).state == "fingerprint"


async def test_low_battery_issue(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """A repair appears below 20% and goes away again from 25%."""
    await _setup(hass, config_entry)
    issues = ir.async_get(hass)
    issue_id = f"low_battery_{config_entry.entry_id}"

    await _advertise(hass, flags=0, battery=15)
    issue = issues.async_get_issue(DOMAIN, issue_id)
    assert issue is not None
    assert issue.translation_placeholders == {"name": "Office safe", "battery": "15"}

    await _advertise(hass, flags=0, battery=22)
    assert issues.async_get_issue(DOMAIN, issue_id) is not None
    await _advertise(hass, flags=0, battery=30)
    assert issues.async_get_issue(DOMAIN, issue_id) is None


def test_describe_mapping() -> None:
    """Log record types map to a method and action; unknown types stay usable."""
    assert describe(log_entry(1, LogOperate.PASSCODE_LOCK, 0)).action == "lock"
    alarm = describe(log_entry(1, LogOperate.DOOR_NOT_CLOSE_ALARM, 0))
    assert (alarm.method, alarm.action) == ("alarm", "other")
    failed = describe(log_entry(1, LogOperate.FR_UNLOCK_FAILED, 0, password="3"))
    assert (failed.method, failed.credential) == ("failed", None)
    other = describe(log_entry(1, LogOperate.DOOR_REBOOT, 0))
    assert other.method == "other"
    unknown = describe(log_entry(1, 250, 0))
    assert (unknown.method, unknown.record_type) == ("other", "unknown_250")
    undated = describe(LogEntry(record_number=1, record_type=1, operate_date=None, lock_battery=1))
    assert undated.as_event_data()["time"] is None


async def test_add_passcodes(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Permanent and time-limited passcodes reach the safe in its local time."""
    await hass.config.async_set_time_zone("Europe/London")
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)

    await _passcode(hass, "add_passcode", code="482916")
    mock_client.add_passcode.assert_awaited_with("482916")

    await _passcode(
        hass, "add_passcode", code="1357", start="2026-11-01 09:00:00", end="2026-11-02T18:30:00Z"
    )
    mock_client.add_passcode.assert_awaited_with(
        "1357", pwd_type=KeyboardPwdType.PERIOD, start_date="2611010900", end_date="2611021830"
    )

    with pytest.raises(ServiceValidationError, match="later than"):
        await _passcode(
            hass, "add_passcode", code="1357", start="2026-11-02 09:00:00", end="2026-11-01 09:00"
        )
    with pytest.raises(Exception, match="match"):
        await _passcode(hass, "add_passcode", code="12a")


async def test_timed_passcode_defaults_to_now(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Without a start, a time-limited passcode works from now."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    end = dt_util.now() + dt.timedelta(days=1)
    await _passcode(hass, "add_passcode", code="2468", end=end.isoformat())
    kwargs = mock_client.add_passcode.call_args.kwargs
    assert kwargs["start_date"] == dt_util.now().strftime("%y%m%d%H%M")


async def test_delete_and_clear_passcodes(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Deleting falls back to the time-limited type; clearing wipes every code."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)

    await _passcode(hass, "delete_passcode", code="482916")
    mock_client.delete_passcode.assert_awaited_once_with("482916")

    mock_client.delete_passcode.side_effect = [TTLockError("not permanent"), None]
    await _passcode(hass, "delete_passcode", code="1357")
    mock_client.delete_passcode.assert_awaited_with("1357", pwd_type=KeyboardPwdType.PERIOD)

    await _passcode(hass, "clear_passcodes")
    mock_client.clear_passcodes.assert_awaited_once()


async def test_list_passcodes(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Listing returns each passcode with its type and validity in local time."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    mock_client.get_passcodes.return_value = [
        PasscodeEntry("482916", KeyboardPwdType.PERMANENT, None, None, None),
        PasscodeEntry(
            "1357",
            KeyboardPwdType.PERIOD,
            dt.datetime(2026, 11, 1, 9, 0),  # noqa: DTZ001 - lock-local time
            dt.datetime(2026, 11, 2, 18, 30),  # noqa: DTZ001 - lock-local time
            None,
        ),
    ]
    response = await _passcode(hass, "list_passcodes")
    passcodes = response[LOCK_ENTITY]["passcodes"]
    assert passcodes[0] == {
        "passcode": "482916",
        "type": "permanent",
        "start": None,
        "end": None,
        "name": None,
    }
    assert passcodes[1]["type"] == "period"
    assert passcodes[1]["start"].startswith("2026-11-01T09:00:00")


async def test_passcodes_need_admin(hass: HomeAssistant, mock_client: MagicMock) -> None:
    """A shared key can't manage passcodes, and the safe isn't contacted."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=ADDRESS,
        title="Office safe",
        data={"address": ADDRESS, "key": make_key().to_dict()},
    )
    entry.add_to_hass(hass)
    await _setup(hass, entry)
    await _advertise(hass, flags=0)
    with pytest.raises(ServiceValidationError, match="admin key"):
        await _passcode(hass, "add_passcode", code="482916")
    mock_client.connect.assert_not_awaited()


async def test_passcode_command_failure(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A safe that refuses the command reports it."""
    await _setup(hass, config_entry)
    await _advertise(hass, flags=0)
    mock_client.clear_passcodes.side_effect = TTLockError("refused")
    with pytest.raises(HomeAssistantError, match="did not complete"):
        await _passcode(hass, "clear_passcodes")
