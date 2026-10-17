"""Tests for restricting the safe to admins and allowed users, and for masked passcodes."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    MockUser,
    async_capture_events,
)

from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.auth.models import User
from homeassistant.components.lock import DOMAIN as LOCK_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_LOCK, SERVICE_UNLOCK
from homeassistant.core import Context, HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import Unauthorized

from custom_components.populife.const import (
    CONF_ALLOWED_USERS,
    CONF_SHOW_PASSCODES,
    DOMAIN,
    EVENT_ACCESS_DENIED,
)
from custom_components.populife.passcodes import mask

from . import inject, service_info

LOCK_ENTITY = "lock.office_safe"
PASSCODES = "sensor.office_safe_passcodes"
DELETE_PICK = "select.office_safe_passcode_to_delete"

# Every control the safe offers: (domain, service, extra data, entity).
GUARDED: list[tuple[str, str, dict[str, Any], str]] = [
    (LOCK_DOMAIN, SERVICE_UNLOCK, {}, LOCK_ENTITY),
    (LOCK_DOMAIN, SERVICE_LOCK, {}, LOCK_ENTITY),
    (DOMAIN, "add_passcode", {"code": "482916"}, LOCK_ENTITY),
    (DOMAIN, "delete_passcode", {"code": "482916"}, LOCK_ENTITY),
    (DOMAIN, "clear_passcodes", {}, LOCK_ENTITY),
    ("button", "press", {}, "button.office_safe_refresh"),
    ("button", "press", {}, "button.office_safe_sync_clock"),
    ("button", "press", {}, "button.office_safe_generate_passcode"),
    ("button", "press", {}, "button.office_safe_add_passcode"),
    ("button", "press", {}, "button.office_safe_delete_passcode"),
    ("switch", "turn_on", {}, "switch.office_safe_lock_sound"),
    ("switch", "turn_off", {}, "switch.office_safe_lock_sound"),
    ("number", "set_value", {"value": 30}, "number.office_safe_auto_lock_delay"),
    ("select", "select_option", {"option": "timed"}, "select.office_safe_passcode_type"),
    ("text", "set_value", {"value": "Guest"}, "text.office_safe_passcode_name"),
    ("text", "set_value", {"value": "4829"}, "text.office_safe_passcode"),
    (
        "datetime",
        "set_value",
        {"datetime": "2026-11-07 09:00:00"},
        "datetime.office_safe_passcode_valid_from",
    ),
]
RESPONSE_SERVICES = ["list_passcodes", "list_fingerprints"]


@pytest.fixture
async def household_user(hass: HomeAssistant, hass_owner_user: MockUser) -> User:
    """A regular, non-admin Home Assistant user, whom Home Assistant lets control everything.

    The owner exists first: Home Assistant makes the first user it creates the owner.
    """
    user = await hass.auth.async_create_user("Guest", group_ids=[GROUP_ID_USER])
    assert not user.is_admin
    return user


async def _setup(hass: HomeAssistant, entry: MockConfigEntry, **options: Any) -> None:
    if options:
        hass.config_entries.async_update_entry(entry, options=options)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()


async def _call(
    hass: HomeAssistant, domain: str, service: str, data: dict[str, Any], user: User | None
) -> Any:
    return await hass.services.async_call(
        domain,
        service,
        data,
        blocking=True,
        context=Context(user_id=user.id) if user else None,
        return_response=service in RESPONSE_SERVICES,
    )


@pytest.mark.parametrize(("domain", "service", "data", "entity_id"), GUARDED)
async def test_other_users_are_refused(  # noqa: PLR0917
    hass: HomeAssistant,
    household_user: User,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    domain: str,
    service: str,
    data: dict[str, Any],
    entity_id: str,
) -> None:
    """A user who is neither admin nor allowed can't operate anything on the safe."""
    await _setup(hass, config_entry)
    denied = async_capture_events(hass, EVENT_ACCESS_DENIED)
    with pytest.raises(Unauthorized):
        await _call(hass, domain, service, {ATTR_ENTITY_ID: entity_id, **data}, household_user)
    await hass.async_block_till_done()
    assert [event.data for event in denied] == [
        {
            "entity_id": entity_id,
            "user_id": household_user.id,
            "name": household_user.name,
        }
    ]
    mock_client.connect.assert_not_awaited()


@pytest.mark.parametrize("service", RESPONSE_SERVICES)
async def test_lists_are_refused(
    hass: HomeAssistant,
    household_user: User,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
    service: str,
) -> None:
    """The passcode and fingerprint lists are only for those who may operate the safe."""
    await _setup(hass, config_entry)
    with pytest.raises(Unauthorized):
        await _call(hass, DOMAIN, service, {ATTR_ENTITY_ID: LOCK_ENTITY}, household_user)
    mock_client.get_passcodes.assert_not_awaited()


async def test_admin_allowed_user_and_automations_pass(
    hass: HomeAssistant,
    hass_admin_user: MockUser,
    household_user: User,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
) -> None:
    """Admins, users picked in the options and calls without a user operate the safe."""
    await _setup(hass, config_entry, **{CONF_ALLOWED_USERS: [household_user.id]})
    for user in (hass_admin_user, household_user, None):
        await _call(hass, LOCK_DOMAIN, SERVICE_UNLOCK, {ATTR_ENTITY_ID: LOCK_ENTITY}, user)
    assert mock_client.unlock.await_count == 3

    response = await _call(
        hass, DOMAIN, "list_passcodes", {ATTR_ENTITY_ID: LOCK_ENTITY}, household_user
    )
    assert response == {LOCK_ENTITY: {"passcodes": []}}


async def test_unknown_user_is_refused(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """A context naming a user that no longer exists is refused."""
    await _setup(hass, config_entry)
    with pytest.raises(Unauthorized):
        await hass.services.async_call(
            LOCK_DOMAIN,
            SERVICE_UNLOCK,
            {ATTR_ENTITY_ID: LOCK_ENTITY},
            blocking=True,
            context=Context(user_id="gone"),
        )
    mock_client.unlock.assert_not_awaited()


async def test_options_flow(
    hass: HomeAssistant,
    hass_admin_user: MockUser,
    household_user: User,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
) -> None:
    """The options offer only non-admin people, and showing codes applies without a reload."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator.async_add_passcode("482916", None, None, "Mama")
    await hass.async_block_till_done()
    assert hass.states.get(PASSCODES).attributes["passcodes"][0]["code"] == "****16"

    result = await hass.config_entries.options.async_init(config_entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    users_selector = next(key for key in result["data_schema"].schema if key == CONF_ALLOWED_USERS)
    offered = [
        option["value"] for option in result["data_schema"].schema[users_selector].config["options"]
    ]
    assert household_user.id in offered
    assert hass_admin_user.id not in offered

    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {CONF_ALLOWED_USERS: [household_user.id], CONF_SHOW_PASSCODES: True},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert config_entry.options[CONF_ALLOWED_USERS] == [household_user.id]
    assert config_entry.runtime_data is coordinator  # applied without a reload
    assert hass.states.get(PASSCODES).attributes["passcodes"][0]["code"] == "482916"
    assert hass.states.get(DELETE_PICK).attributes["options"] == ["Mama (482916)"]


async def test_masked_labels_stay_unique(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_client: MagicMock
) -> None:
    """Two codes that mask the same still get distinct delete labels, each to its own code."""
    await _setup(hass, config_entry)
    coordinator = config_entry.runtime_data
    await coordinator.passcodes.async_add("111116", "Kid", None, None)
    await coordinator.passcodes.async_add("222216", "Kid", None, None)
    coordinator.async_update_listeners()
    await hass.async_block_till_done()
    options = hass.states.get(DELETE_PICK).attributes["options"]
    assert options == ["Kid (****16)", "Kid (****16) #2"]

    await hass.services.async_call(
        "select",
        "select_option",
        {ATTR_ENTITY_ID: DELETE_PICK, "option": "Kid (****16) #2"},
        blocking=True,
    )
    assert coordinator.draft.delete_code == "222216"


def test_mask() -> None:
    """Only the last two digits show."""
    assert mask("482916") == "****16"
    assert mask("7319") == "**19"
