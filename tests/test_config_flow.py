"""Tests for the Populife config flow."""

from __future__ import annotations

import base64
from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from ttlock_ble import CloudError, TTLockError
from ttlock_ble.crypto import _DECODE_TABLE, decode_password

from homeassistant.config_entries import SOURCE_BLUETOOTH, SOURCE_USER
from homeassistant.const import CONF_ADDRESS, CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.populife import config_flow
from custom_components.populife.const import (
    CONF_ADMIN_PASSWORD,
    CONF_AES_KEY,
    CONF_BACK,
    CONF_GROUP_ID,
    CONF_KEY,
    CONF_ORG_ID,
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


async def test_reauth_from_cloud(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_cloud: MagicMock
) -> None:
    """Reauth imports a fresh key into the existing entry and keeps its title."""
    mock_cloud.list_keys.return_value = [make_key()]
    result = await config_entry.start_reauth_flow(hass)
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "reauth_confirm"
    assert result["description_placeholders"] == {"name": "Office safe"}

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "cloud"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], CLOUD_INPUT)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert config_entry.title == "Office safe"
    assert config_entry.data[CONF_KEY]["adminPs"] == ""
    assert config_entry.data[CONF_ADDRESS] == ADDRESS


async def test_reauth_manual_keeps_firmware_ids(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_flow_client: MagicMock
) -> None:
    """A hand-entered key reuses the entry's firmware ids, not the defaults."""
    lock_version = {
        "protocolType": 5,
        "protocolVersion": 3,
        "scene": 2,
        "groupId": 7,
        "orgId": 9,
    }
    key = {**config_entry.data[CONF_KEY], "lockVersion": lock_version}
    hass.config_entries.async_update_entry(config_entry, data={**config_entry.data, CONF_KEY: key})
    inject(hass, service_info())
    await hass.async_block_till_done()

    result = await config_entry.start_reauth_flow(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "manual"}
    )
    assert result["step_id"] == "manual"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {**MANUAL_INPUT, CONF_UNLOCK_KEY: "555"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert config_entry.data[CONF_KEY]["unlockKey"] == "555"
    assert config_entry.data[CONF_KEY]["lockVersion"] == lock_version
    assert config_entry.data[CONF_KEY]["lockAlias"] == "Office safe"


async def test_reauth_cloud_wrong_safe(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_cloud: MagicMock
) -> None:
    """An account without this safe cannot replace its key."""
    mock_cloud.list_keys.return_value = [make_key(address="11:22:33:44:55:66")]
    result = await config_entry.start_reauth_flow(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "cloud"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], CLOUD_INPUT)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "lock_not_in_account"}


async def test_reconfigure_from_cloud(
    hass: HomeAssistant, mock_cloud: MagicMock, mock_flow_client: MagicMock
) -> None:
    """Reconfigure upgrades a shared key to the owner's admin key."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=ADDRESS,
        title="Office safe",
        data={CONF_ADDRESS: ADDRESS, CONF_KEY: make_key().to_dict()},
    )
    entry.add_to_hass(hass)

    result = await entry.start_reconfigure_flow(hass)
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "reconfigure"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "cloud"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], CLOUD_INPUT)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reconfigure_successful"
    assert entry.data[CONF_KEY]["adminPs"] == "987654321"


async def test_reconfigure_manual(
    hass: HomeAssistant, config_entry: MockConfigEntry, mock_flow_client: MagicMock
) -> None:
    """Reconfigure can take a hand-entered key, checked against the safe first."""
    inject(hass, service_info())
    await hass.async_block_till_done()
    result = await config_entry.start_reconfigure_flow(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "manual"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {**MANUAL_INPUT, CONF_ADMIN_PASSWORD: "246810"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reconfigure_successful"
    assert config_entry.data[CONF_KEY]["adminPs"] == "246810"
    mock_flow_client.query_state.assert_awaited_once()


def _cloud_encode(secret: str, xor_const: int = 0x5A) -> str:
    """Encode `secret` the way the cloud sync encodes lockKey / adminPwd."""
    payload = [byte ^ xor_const for byte in secret.encode("ascii")]
    payload.append(_DECODE_TABLE[len(payload) % 256] ^ xor_const)
    return base64.b64encode(",".join(map(str, payload)).encode("ascii")).decode("ascii")


@pytest.mark.parametrize("step", ["cloud", "manual"])
async def test_back_to_method_menu(
    hass: HomeAssistant, mock_flow_client: MagicMock, step: str
) -> None:
    """Every key form can return to the method menu to pick the other way."""
    flow_id = await _open_step(hass, step)
    result = await hass.config_entries.flow.async_configure(flow_id, {CONF_BACK: True})
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "method"

    other = "cloud" if step == "manual" else "manual"
    result = await hass.config_entries.flow.async_configure(flow_id, {"next_step_id": other})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == other


async def test_back_from_verification(hass: HomeAssistant, mock_cloud: MagicMock) -> None:
    """The verification-code form can also go back to the menu."""
    flow_id = await _open_step(hass, "cloud")
    mock_cloud.login.side_effect = CloudError({"errorCode": -1014})
    result = await hass.config_entries.flow.async_configure(flow_id, CLOUD_INPUT)
    assert result["step_id"] == "cloud_verify"

    result = await hass.config_entries.flow.async_configure(flow_id, {})
    assert result["errors"] == {CONF_VERIFICATION_CODE: "required"}

    result = await hass.config_entries.flow.async_configure(flow_id, {CONF_BACK: True})
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "method"


async def test_back_returns_to_reconfigure_menu(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Going back during reconfigure shows the reconfigure menu, not the setup one."""
    result = await config_entry.start_reconfigure_flow(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "manual"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {CONF_BACK: True})
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "reconfigure"


@pytest.mark.parametrize(
    ("step", "expected"),
    [
        ("cloud", {CONF_EMAIL: "required", CONF_PASSWORD: "required"}),
        ("manual", {CONF_AES_KEY: "required", CONF_UNLOCK_KEY: "required"}),
    ],
)
async def test_empty_form_needs_fields(
    hass: HomeAssistant,
    mock_cloud: MagicMock,
    mock_flow_client: MagicMock,
    step: str,
    expected: dict[str, str],
) -> None:
    """Submitting a form empty, without going back, asks for its fields."""
    flow_id = await _open_step(hass, step)
    result = await hass.config_entries.flow.async_configure(flow_id, {CONF_BACK: False})
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == expected
    mock_cloud.login.assert_not_awaited()
    mock_flow_client.query_state.assert_not_awaited()


async def test_manual_accepts_encoded_cloud_values(
    hass: HomeAssistant, mock_flow_client: MagicMock
) -> None:
    """lockKey and adminPwd can be pasted as the app's sync data encodes them."""
    lock_key, admin_pwd = _cloud_encode("1234567890"), _cloud_encode("11223344")
    assert decode_password(lock_key) == "1234567890"

    flow_id = await _open_step(hass, "manual")
    result = await hass.config_entries.flow.async_configure(
        flow_id,
        {**MANUAL_INPUT, CONF_UNLOCK_KEY: lock_key, CONF_ADMIN_PASSWORD: admin_pwd},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_KEY]["unlockKey"] == "1234567890"
    assert result["data"][CONF_KEY]["adminPs"] == "11223344"


async def test_manual_rejects_undecodable_value(
    hass: HomeAssistant, mock_flow_client: MagicMock
) -> None:
    """A long value that is neither digits nor a valid encoding is rejected."""
    flow_id = await _open_step(hass, "manual")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {**MANUAL_INPUT, CONF_UNLOCK_KEY: "not-base64-at-all!"}
    )
    assert result["errors"] == {CONF_UNLOCK_KEY: "invalid_unlock_key"}


def _suggested(result: dict, field: str) -> object:
    """Return the value a form prefills for `field`."""
    key = next(key for key in result["data_schema"].schema if key == field)
    return (key.description or {}).get("suggested_value")


async def test_manual_frame_ids(hass: HomeAssistant, mock_flow_client: MagicMock) -> None:
    """Group and org ids default to 1 and can be set from the app's sync data."""
    flow_id = await _start_from_bluetooth(hass)
    form = await hass.config_entries.flow.async_configure(flow_id, {"next_step_id": "manual"})
    assert _suggested(form, CONF_GROUP_ID) == 1
    assert _suggested(form, CONF_ORG_ID) == 1

    result = await hass.config_entries.flow.async_configure(
        flow_id, {**MANUAL_INPUT, CONF_GROUP_ID: 15.0, CONF_ORG_ID: 2.0}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    stored = result["data"][CONF_KEY]["lockVersion"]
    assert (stored["groupId"], stored["orgId"]) == (15, 2)
    # The one-time key check already talks to the safe with the entered ids.
    checked = config_flow.TTLockClient.from_ble_device.call_args.args[1]
    assert (checked.lockVersion.groupId, checked.lockVersion.orgId) == (15, 2)


async def test_reauth_prefills_entry_frame_ids(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """During reauth the manual form starts from the entry's own group and org ids."""
    lock_version = {"protocolType": 5, "protocolVersion": 3, "scene": 2, "groupId": 15, "orgId": 2}
    key = {**config_entry.data[CONF_KEY], "lockVersion": lock_version}
    hass.config_entries.async_update_entry(config_entry, data={**config_entry.data, CONF_KEY: key})
    result = await config_entry.start_reauth_flow(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "manual"}
    )
    assert _suggested(result, CONF_GROUP_ID) == 15
    assert _suggested(result, CONF_ORG_ID) == 2
