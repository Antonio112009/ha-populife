"""Tests for the Populife config flow."""

from __future__ import annotations

from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import CloudError, TTLockError

from homeassistant.config_entries import SOURCE_BLUETOOTH, SOURCE_USER
from homeassistant.const import CONF_ADDRESS, CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.populife.const import (
    CONF_ADMIN_PASSWORD,
    CONF_AES_KEY,
    CONF_KEY,
    CONF_UNLOCK_KEY,
    CONF_VERIFICATION_CODE,
    DOMAIN,
)

from . import ADDRESS, inject, make_key, service_info

CLOUD_INPUT = {CONF_EMAIL: "me@example.com", CONF_PASSWORD: "hunter2"}
MANUAL_INPUT = {
    CONF_AES_KEY: "00,11,22,33,44,55,66,77,88,99,aa,bb,cc,dd,ee,ff",
    CONF_UNLOCK_KEY: "123456789",
}


@pytest.fixture
def mock_cloud() -> Generator[MagicMock]:
    """Patch the TTLock cloud client."""
    cloud = MagicMock()
    cloud.discover_site = AsyncMock()
    cloud.login = AsyncMock()
    cloud.request_login_verification_code = AsyncMock()
    cloud.validate_new_device = AsyncMock()
    cloud.list_keys = AsyncMock(
        return_value=[make_key(address="11:22:33:44:55:66"), make_key(), make_key(admin=True)]
    )
    with patch("custom_components.populife.config_flow.TTLockCloud", return_value=cloud):
        yield cloud


async def _start_from_bluetooth(hass: HomeAssistant) -> str:
    inject(hass, service_info())
    await hass.async_block_till_done()
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_BLUETOOTH}, data=service_info()
    )
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "method"
    return result["flow_id"]


async def _open_step(hass: HomeAssistant, step: str) -> str:
    flow_id = await _start_from_bluetooth(hass)
    result = await hass.config_entries.flow.async_configure(flow_id, {"next_step_id": step})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == step
    return flow_id


async def test_bluetooth_not_a_safe(hass: HomeAssistant) -> None:
    """An advertisement without TTLock manufacturer data is ignored."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_BLUETOOTH}, data=service_info(mfr_data={})
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "not_supported"


async def test_bluetooth_already_configured(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """A safe that is set up already is not offered again."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_BLUETOOTH}, data=service_info()
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_user_no_devices(hass: HomeAssistant) -> None:
    """The user step aborts when no safe is in range."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "no_devices_found"


async def test_user_picks_device(hass: HomeAssistant, mock_flow_client: MagicMock) -> None:
    """The user step lists safes in range and leads to the key menu."""
    inject(hass, service_info())
    inject(hass, service_info(address="11:22:33:44:55:66", mfr_data={0x0999: b"\x00\x01"}))
    await hass.async_block_till_done()

    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_ADDRESS: ADDRESS}
    )
    assert result["type"] is FlowResultType.MENU
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "manual"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], MANUAL_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["result"].unique_id == ADDRESS


async def test_manual_success(hass: HomeAssistant, mock_flow_client: MagicMock) -> None:
    """A hand-entered key is checked against the safe and stored."""
    flow_id = await _open_step(hass, "manual")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {**MANUAL_INPUT, CONF_ADMIN_PASSWORD: "555"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "S31_eeff"
    key = result["data"][CONF_KEY]
    assert key["lockMac"] == ADDRESS
    assert key["unlockKey"] == "123456789"
    assert key["adminPs"] == "555"
    assert key["lockVersion"] == {
        "protocolType": 5,
        "protocolVersion": 3,
        "scene": 2,
        "groupId": 1,
        "orgId": 1,
    }
    mock_flow_client.query_state.assert_awaited_once()


async def test_manual_invalid_input(hass: HomeAssistant, mock_flow_client: MagicMock) -> None:
    """Malformed secrets are rejected per field before touching the safe."""
    flow_id = await _open_step(hass, "manual")
    result = await hass.config_entries.flow.async_configure(
        flow_id,
        {CONF_AES_KEY: "nothex", CONF_UNLOCK_KEY: "12ab", CONF_ADMIN_PASSWORD: "x"},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {
        CONF_AES_KEY: "invalid_aes_key",
        CONF_UNLOCK_KEY: "invalid_unlock_key",
        CONF_ADMIN_PASSWORD: "invalid_admin_password",
    }
    mock_flow_client.query_state.assert_not_awaited()


async def test_manual_cannot_connect(hass: HomeAssistant, mock_flow_client: MagicMock) -> None:
    """A key the safe does not answer to shows an error and can be retried."""
    flow_id = await _open_step(hass, "manual")
    mock_flow_client.query_state.side_effect = TTLockError("bad key")
    result = await hass.config_entries.flow.async_configure(flow_id, MANUAL_INPUT)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "cannot_connect"}

    mock_flow_client.query_state.side_effect = None
    result = await hass.config_entries.flow.async_configure(flow_id, MANUAL_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_manual_device_gone(hass: HomeAssistant, mock_flow_client: MagicMock) -> None:
    """The key check fails cleanly when no adapter can reach the safe."""
    flow_id = await _open_step(hass, "manual")
    with patch(
        "custom_components.populife.config_flow.async_ble_device_from_address", return_value=None
    ):
        result = await hass.config_entries.flow.async_configure(flow_id, MANUAL_INPUT)
    assert result["errors"] == {"base": "cannot_connect"}


async def test_cloud_success(hass: HomeAssistant, mock_cloud: MagicMock) -> None:
    """The admin key for this safe is imported from the account."""
    flow_id = await _open_step(hass, "cloud")
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Office safe"
    assert result["data"][CONF_KEY]["adminPs"] == "987654321"
    assert "hunter2" not in str(result["data"])
    mock_cloud.login.assert_awaited_once_with("me@example.com", "hunter2")


async def test_cloud_new_device_verification(hass: HomeAssistant, mock_cloud: MagicMock) -> None:
    """A first login from this install asks for the emailed code."""
    flow_id = await _open_step(hass, "cloud")
    mock_cloud.login.side_effect = [CloudError({"errorCode": -1014}), None, None]

    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "cloud_verify"
    mock_cloud.request_login_verification_code.assert_awaited_once_with("me@example.com")

    mock_cloud.validate_new_device.side_effect = CloudError({"errcode": 1})
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_VERIFICATION_CODE: "000000"}
    )
    assert result["errors"] == {"base": "invalid_code"}

    mock_cloud.validate_new_device.side_effect = httpx.ConnectError("down")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_VERIFICATION_CODE: "000000"}
    )
    assert result["errors"] == {"base": "cannot_connect"}

    mock_cloud.validate_new_device.side_effect = None
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_VERIFICATION_CODE: " 123456 "}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    mock_cloud.validate_new_device.assert_awaited_with("me@example.com", "123456")


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (CloudError({"errorCode": 10003, "errmsg": "bad password"}), "invalid_auth"),
        (CloudError({"errmsg": "no code"}), "invalid_auth"),
        (httpx.ConnectError("down"), "cannot_connect"),
    ],
)
async def test_cloud_login_errors(
    hass: HomeAssistant, mock_cloud: MagicMock, error: Exception, expected: str
) -> None:
    """Login failures are shown on the form and the user can retry."""
    flow_id = await _open_step(hass, "cloud")
    mock_cloud.login.side_effect = error
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": expected}

    mock_cloud.login.side_effect = None
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_cloud_verification_code_request_fails(
    hass: HomeAssistant, mock_cloud: MagicMock
) -> None:
    """Failing to send the verification code is a connection error."""
    flow_id = await _open_step(hass, "cloud")
    mock_cloud.login.side_effect = CloudError({"errorCode": "-1014"})
    mock_cloud.request_login_verification_code.side_effect = httpx.ConnectError("down")
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["errors"] == {"base": "cannot_connect"}


async def test_cloud_lock_not_in_account(hass: HomeAssistant, mock_cloud: MagicMock) -> None:
    """An account without this safe's key is reported."""
    flow_id = await _open_step(hass, "cloud")
    mock_cloud.list_keys.return_value = [make_key(address="11:22:33:44:55:66")]
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "lock_not_in_account"}


async def test_cloud_list_keys_fails(hass: HomeAssistant, mock_cloud: MagicMock) -> None:
    """A failing key sync is a connection error."""
    flow_id = await _open_step(hass, "cloud")
    mock_cloud.list_keys.side_effect = httpx.ReadTimeout("slow")
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["errors"] == {"base": "cannot_connect"}


async def test_cloud_prefers_any_key_without_admin(
    hass: HomeAssistant, mock_cloud: MagicMock
) -> None:
    """A shared (non-admin) key is used when it is the only one."""
    flow_id = await _open_step(hass, "cloud")
    mock_cloud.list_keys.return_value = [make_key()]
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_KEY]["adminPs"] == ""
