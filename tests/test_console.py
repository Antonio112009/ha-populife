"""Tests for the passcode console: names, generation, temporary codes, deletion, who opened."""

from __future__ import annotations

import datetime as dt
from typing import Any
from unittest.mock import MagicMock

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import KeyboardPwdType, LogOperate, PasscodeEntry

from homeassistant.components import persistent_notification
from homeassistant.components.button import DOMAIN as BUTTON_DOMAIN, SERVICE_PRESS
from homeassistant.components.datetime import DOMAIN as DATETIME_DOMAIN
from homeassistant.components.select import DOMAIN as SELECT_DOMAIN, SERVICE_SELECT_OPTION
from homeassistant.components.text import DOMAIN as TEXT_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util

from custom_components.populife.const import DOMAIN
from custom_components.populife.passcodes import conflicts, generate
from custom_components.populife.sensor import PopulifeSensor

from . import inject, service_info
from .test_event import log_entry

NAME = "text.office_safe_passcode_name"
CODE = "text.office_safe_passcode"
TYPE = "select.office_safe_passcode_type"
START = "datetime.office_safe_passcode_valid_from"
END = "datetime.office_safe_passcode_valid_until"
GENERATE = "button.office_safe_generate_passcode"
ADD = "button.office_safe_add_passcode"
DELETE_PICK = "select.office_safe_passcode_to_delete"
DELETE = "button.office_safe_delete_passcode"
PASSCODES = "sensor.office_safe_passcodes"
LAST_USER = "sensor.office_safe_last_unlocked_by"


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()


async def _call(hass: HomeAssistant, domain: str, service: str, **data: Any) -> None:
    await hass.services.async_call(domain, service, data, blocking=True)
    await hass.async_block_till_done()


async def _type(hass: HomeAssistant, entity_id: str, value: str) -> None:
    await _call(hass, TEXT_DOMAIN, "set_value", entity_id=entity_id, value=value)


async def _press(hass: HomeAssistant, entity_id: str) -> None:
    await _call(hass, BUTTON_DOMAIN, SERVICE_PRESS, entity_id=entity_id)


def _notifications(hass: HomeAssistant) -> dict[str, Any]:
    return persistent_notification._async_get_or_create_notifications(hass)


async def test_add_permanent_named_code(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A named permanent code is added, announced, listed by name and the form is cleared."""
    await _setup(hass, config_entry)
    await _type(hass, NAME, "Mama")
    await _type(hass, CODE, "482916")
    await _press(hass, ADD)

    mock_client.add_passcode.assert_awaited_once_with("482916")
    mock_client.sync_time.assert_not_awaited()
    notification = next(iter(_notifications(hass).values()))
    assert "Mama" in notification["message"]
    assert "482916" in notification["message"]
    assert "permanent" in notification["message"]
    assert hass.states.get(NAME).state == ""
    assert hass.states.get(CODE).state == ""

    rows = hass.states.get(PASSCODES).attributes["passcodes"]
    assert rows == [
        {
            "name": "Mama",
            "code": "482916",
            "type": "permanent",
            "start": None,
            "end": None,
            "on_safe": True,
        }
    ]
    assert hass.states.get(DELETE_PICK).attributes["options"] == ["Mama (482916)"]
    assert "passcodes" in PopulifeSensor._unrecorded_attributes


async def test_add_temporary_code_syncs_clock(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A temporary code syncs the safe's clock first and keeps its window."""
    await hass.config.async_set_time_zone("Europe/London")
    await _setup(hass, config_entry)
    await _type(hass, NAME, "Guest")
    await _type(hass, CODE, "7319")
    await _call(hass, SELECT_DOMAIN, SERVICE_SELECT_OPTION, entity_id=TYPE, option="timed")
    await _call(hass, DATETIME_DOMAIN, "set_value", entity_id=START, datetime="2026-11-07 09:00:00")
    await _call(hass, DATETIME_DOMAIN, "set_value", entity_id=END, datetime="2026-11-09 20:00:00")
    assert hass.states.get(TYPE).state == "timed"
    await _press(hass, ADD)

    mock_client.sync_time.assert_awaited_once()
    mock_client.add_passcode.assert_awaited_once_with(
        "7319", pwd_type=KeyboardPwdType.PERIOD, start_date="2611070900", end_date="2611092000"
    )
    notification = next(iter(_notifications(hass).values()))
    assert "2026-11-07 09:00 to 2026-11-09 20:00" in notification["message"]
    row = hass.states.get(PASSCODES).attributes["passcodes"][0]
    assert (row["name"], row["type"]) == ("Guest", "timed")
    assert row["end"].startswith("2026-11-09T20:00:00")
    # The window is reset to the next 24 hours for the next code.
    assert hass.states.get(START).state != "2026-11-07T09:00:00+00:00"


async def test_generate_avoids_known_codes(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Generated codes have 6 digits and never clash with the safe's codes."""
    await _setup(hass, config_entry)
    config_entry.runtime_data.safe_passcodes = [{"passcode": "1234"}]
    for _ in range(20):
        await _press(hass, GENERATE)
        code = hass.states.get(CODE).state
        assert len(code) == 6
        assert code.isdigit()
        assert not code.startswith("1234")


async def test_console_errors(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Missing code, missing selection, clashing code and missing end are refused up front."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    with pytest.raises(ServiceValidationError, match="Fill in the passcode"):
        await _press(hass, ADD)
    with pytest.raises(ServiceValidationError, match="Fill in the passcode"):
        await _press(hass, DELETE)

    await coordinator.passcodes.async_add("1234", "Kid", None, None)
    await _type(hass, CODE, "12345")
    with pytest.raises(ServiceValidationError, match="clashes"):
        await _press(hass, ADD)

    coordinator.async_update_draft(code="5555", type="timed", end=None)
    with pytest.raises(ServiceValidationError, match="valid until"):
        await _press(hass, ADD)

    with pytest.raises(ServiceValidationError, match="4 to 9 digits"):
        await coordinator.async_add_passcode("12", None, None)
    mock_client.add_passcode.assert_not_awaited()


async def test_delete_by_name(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Picking a code by name and pressing delete removes it from the safe and the list."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator.async_add_passcode("482916", None, None, "Mama")
    await coordinator.async_add_passcode("7319", None, None)
    await hass.async_block_till_done()
    assert hass.states.get(DELETE_PICK).attributes["options"] == ["Mama (482916)", "7319"]

    await _call(
        hass, SELECT_DOMAIN, SERVICE_SELECT_OPTION, entity_id=DELETE_PICK, option="Mama (482916)"
    )
    assert hass.states.get(DELETE_PICK).state == "Mama (482916)"
    await _press(hass, DELETE)
    mock_client.delete_passcode.assert_awaited_once_with("482916")
    assert coordinator.passcodes.name("482916") is None
    assert hass.states.get(DELETE_PICK).attributes["options"] == ["7319"]
    assert hass.states.get(DELETE_PICK).state == "unknown"

    await _call(hass, DOMAIN, "clear_passcodes", entity_id="lock.office_safe")
    assert coordinator.passcodes.codes == {}
    assert hass.states.get(PASSCODES).attributes["passcodes"] == []


async def test_names_survive_restart_and_merge_with_safe(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Names are stored, and the list merges them with what the safe reports."""
    await _setup(hass, config_entry)
    await config_entry.runtime_data.async_add_passcode("482916", None, None, "Mama")
    assert await hass.config_entries.async_reload(config_entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info(battery=86))
    await hass.async_block_till_done()

    mock_client.get_passcodes.return_value = [
        PasscodeEntry("482916", KeyboardPwdType.PERMANENT, None, None, None),
        PasscodeEntry("2580", KeyboardPwdType.PERIOD, None, dt.datetime(2026, 12, 1), None),  # noqa: DTZ001
    ]
    response = await hass.services.async_call(
        DOMAIN,
        "list_passcodes",
        {ATTR_ENTITY_ID: "lock.office_safe"},
        blocking=True,
        return_response=True,
    )
    listed = {p["passcode"]: p["name"] for p in response["lock.office_safe"]["passcodes"]}
    assert listed == {"482916": "Mama", "2580": None}
    rows = hass.states.get(PASSCODES).attributes["passcodes"]
    assert [(r["name"], r["code"], r["on_safe"]) for r in rows] == [
        ("Mama", "482916", True),
        (None, "2580", True),
    ]
    assert rows[1]["type"] == "period"


async def test_who_opened(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A keypad opening is attributed to the code's name, never showing the code."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator.passcodes.async_add("482916", "Mama", None, None)
    await coordinator._async_process_log([log_entry(1, LogOperate.MOBILE_UNLOCK, 0)])
    await coordinator._async_process_log(
        [log_entry(2, LogOperate.KEYBOARD_PASSWORD_UNLOCK, 5, password="482916")]
    )
    await hass.async_block_till_done()
    event = hass.states.get("event.office_safe_operation")
    assert event.attributes["user"] == "Mama"
    assert "482916" not in str(event.attributes)
    assert hass.states.get(LAST_USER).state == "Mama"

    # An unnamed code still fires, without a user.
    await coordinator._async_process_log(
        [log_entry(3, LogOperate.KEYBOARD_PASSWORD_UNLOCK, 6, password="999999")]
    )
    await hass.async_block_till_done()
    assert hass.states.get("event.office_safe_operation").attributes["user"] is None


async def test_temporary_window_defaults(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The form starts with a 24-hour window from now."""
    await _setup(hass, config_entry)
    draft = config_entry.runtime_data.draft
    assert draft.start is not None
    assert draft.end is not None
    assert draft.end - draft.start == dt.timedelta(days=1)
    assert abs((draft.start - dt_util.now()).total_seconds()) < 120


def test_conflicts_and_generate() -> None:
    """Prefix clashes go both ways; generation gives up when nothing is free."""
    assert conflicts("1234", ["12345"])
    assert conflicts("12345", ["1234"])
    assert not conflicts("1235", ["1234"])
    with pytest.raises(RuntimeError):
        generate([str(n) for n in range(10)], length=1)
