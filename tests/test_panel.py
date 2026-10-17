"""Tests for the sidebar panel: its websocket API, its JavaScript and its registration."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockUser
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator, WebSocketGenerator

from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.auth.models import User
from homeassistant.core import HomeAssistant

from custom_components.populife.const import CONF_ALLOWED_USERS, DOMAIN
from custom_components.populife.panel import DATA_PANEL, PANEL_URL_PATH

from . import inject, service_info


@pytest.fixture
async def household_user(hass: HomeAssistant, hass_owner_user: MockUser) -> User:
    """A regular, non-admin user (created after the owner, who is an admin)."""
    return await hass.auth.async_create_user("Guest", group_ids=[GROUP_ID_USER])


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    inject(hass, service_info())
    await hass.async_block_till_done()


async def _ws(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    message: dict[str, Any],
    user: User | None = None,
) -> dict[str, Any]:
    token = None
    if user is not None:
        refresh = await hass.auth.async_create_refresh_token(user, "https://example.com/app")
        token = hass.auth.async_create_access_token(refresh)
    client = await hass_ws_client(hass, access_token=token) if token else await hass_ws_client(hass)
    await client.send_json_auto_id(message)
    return await client.receive_json()


async def test_safes_lists_entities_and_access(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    household_user: User,
    config_entry: MockConfigEntry,
) -> None:
    """The panel gets each safe's entities, and whether the caller may operate it."""
    await _setup(hass, config_entry)
    result = await _ws(hass, hass_ws_client, {"type": "populife/safes"})
    assert result["success"]
    (safe,) = result["result"]["safes"]
    assert safe["entry_id"] == config_entry.entry_id
    assert safe["admin_key"] is True
    assert safe["can_operate"] is True
    assert safe["entities"]["lock"] == "lock.office_safe"
    assert safe["entities"]["operation"] == "event.office_safe_operation"
    assert safe["entities"]["sync_clock"] == "button.office_safe_sync_clock"
    # The volume select only exists on safes with a speaker.
    assert "volume" not in safe["entities"]

    result = await _ws(hass, hass_ws_client, {"type": "populife/safes"}, household_user)
    assert result["result"]["safes"][0]["can_operate"] is False


async def test_passcodes_only_for_those_allowed(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    household_user: User,
    config_entry: MockConfigEntry,
    mock_client: MagicMock,
) -> None:
    """Full codes reach admins and allowed users, never anyone else."""
    await _setup(hass, config_entry)
    await config_entry.runtime_data.async_add_passcode("482916", None, None, "Mama")
    message = {"type": "populife/passcodes", "entry_id": config_entry.entry_id}

    result = await _ws(hass, hass_ws_client, message)
    assert result["result"]["passcodes"][0]["code"] == "482916"
    assert result["result"]["fingerprints"] == []

    result = await _ws(hass, hass_ws_client, message, household_user)
    assert not result["success"]
    assert result["error"]["code"] == "not_allowed"

    hass.config_entries.async_update_entry(
        config_entry, options={CONF_ALLOWED_USERS: [household_user.id]}
    )
    result = await _ws(hass, hass_ws_client, message, household_user)
    assert result["result"]["passcodes"][0]["name"] == "Mama"


async def test_unknown_safe(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, config_entry: MockConfigEntry
) -> None:
    """Asking for a safe that isn't loaded is an error."""
    await _setup(hass, config_entry)
    result = await _ws(hass, hass_ws_client, {"type": "populife/passcodes", "entry_id": "nope"})
    assert result["error"]["code"] == "not_found"


async def test_generate(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    household_user: User,
    config_entry: MockConfigEntry,
) -> None:
    """Generated codes have 6 digits and are only handed to those allowed."""
    await _setup(hass, config_entry)
    message = {"type": "populife/generate", "entry_id": config_entry.entry_id}
    result = await _ws(hass, hass_ws_client, message)
    code = result["result"]["code"]
    assert len(code) == 6
    assert code.isdigit()
    result = await _ws(hass, hass_ws_client, message, household_user)
    assert result["error"]["code"] == "not_allowed"


async def test_serves_the_panel_script(
    hass: HomeAssistant, hass_client: ClientSessionGenerator, config_entry: MockConfigEntry
) -> None:
    """Home Assistant serves the built panel from the integration."""
    await _setup(hass, config_entry)
    client = await hass_client()
    response = await client.get(f"/{DOMAIN}_static/populife-panel.js")
    assert response.status == 200
    assert "populife-panel" in await response.text()


async def test_panel_added_and_removed(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """With the frontend running, the panel appears with the first safe and goes with the last."""
    hass.config.components.add("frontend")
    with (
        patch(
            "homeassistant.components.panel_custom.async_register_panel", AsyncMock()
        ) as register,
        patch("homeassistant.components.frontend.async_remove_panel") as remove,
    ):
        await _setup(hass, config_entry)
        register.assert_awaited_once()
        kwargs = register.await_args.kwargs
        assert kwargs["frontend_url_path"] == PANEL_URL_PATH
        assert kwargs["webcomponent_name"] == "populife-panel"
        assert kwargs["require_admin"] is False
        assert kwargs["module_url"].startswith(f"/{DOMAIN}_static/populife-panel.js?v=")
        assert hass.data[DATA_PANEL] is True

        # A reload doesn't register it twice.
        assert await hass.config_entries.async_unload(config_entry.entry_id)
        remove.assert_called_once_with(hass, PANEL_URL_PATH)
        assert DATA_PANEL not in hass.data


async def test_no_panel_without_frontend(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Without Home Assistant's frontend (as in these tests) no panel is registered."""
    with patch("homeassistant.components.panel_custom.async_register_panel") as register:
        await _setup(hass, config_entry)
        assert await hass.config_entries.async_unload(config_entry.entry_id)
    register.assert_not_called()
