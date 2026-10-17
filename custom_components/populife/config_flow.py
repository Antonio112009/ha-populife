"""Config flow for Populife.

The safe is found over Bluetooth. Its per-lock secrets (AES key and unlock
key) either come from a TTLock-family cloud account once, or are entered by
hand. The account password is never stored: only the lock key is kept.
Reauth (after the safe rejects the key) and reconfigure replace the key of
an existing entry through the same cloud and manual steps.
"""

from __future__ import annotations

from dataclasses import replace
import logging
from typing import TYPE_CHECKING, Any, cast

from bleak.exc import BleakError
import httpx
import probatio
from ttlock_ble import CloudError, LockVersion, TTLockClient, TTLockCloud, TTLockError, VirtualKey
from ttlock_ble.crypto import hex_key_to_bytes

from homeassistant.components.bluetooth import (
    BluetoothServiceInfoBleak,
    async_ble_device_from_address,
    async_discovered_service_info,
)
from homeassistant.config_entries import (
    SOURCE_REAUTH,
    SOURCE_RECONFIGURE,
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.const import CONF_ADDRESS, CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import callback
from homeassistant.helpers.httpx_client import get_async_client
from homeassistant.helpers.selector import (
    BooleanSelector,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from .const import (
    CONF_ADMIN_PASSWORD,
    CONF_AES_KEY,
    CONF_ALLOWED_USERS,
    CONF_BACK,
    CONF_FLAG_POS,
    CONF_GROUP_ID,
    CONF_KEY,
    CONF_LOCK_DATA,
    CONF_ORG_ID,
    CONF_SHOW_PASSCODES,
    CONF_UNLOCK_KEY,
    CONF_VERIFICATION_CODE,
    DEFAULT_GROUP_ID,
    DEFAULT_ORG_ID,
    DOMAIN,
    ERR_NEW_DEVICE_LOGIN,
)
from .coordinator import parse_advertisement
from .lock_data import LockDataError, decode_secret, key_from_lock_data

if TYPE_CHECKING:
    from collections.abc import Mapping

    from ttlock_ble import LockAdvertisement

_LOGGER = logging.getLogger(__name__)

_EMAIL_SELECTOR = TextSelector(TextSelectorConfig(type=TextSelectorType.EMAIL))
_PASSWORD_SELECTOR = TextSelector(TextSelectorConfig(type=TextSelectorType.PASSWORD))
# groupId / orgId are two-byte fields of every command frame's header.
_FRAME_ID_SELECTOR = NumberSelector(
    NumberSelectorConfig(min=0, max=0xFFFF, step=1, mode=NumberSelectorMode.BOX)
)

# Home Assistant flows have no back button, so every form ends with a toggle that returns
# to the method menu. That is also why the fields are optional in the schema: a user going
# back must be able to submit an empty form. `_missing` enforces them otherwise.
_BACK_FIELD = {probatio.Optional(CONF_BACK, default=False): BooleanSelector()}

CLOUD_SCHEMA = probatio.Schema(
    {
        probatio.Optional(CONF_EMAIL): _EMAIL_SELECTOR,
        probatio.Optional(CONF_PASSWORD): _PASSWORD_SELECTOR,
        **_BACK_FIELD,
    }
)
APP_DATA_SCHEMA = probatio.Schema(
    {
        probatio.Optional(CONF_LOCK_DATA): TextSelector(TextSelectorConfig(multiline=True)),
        **_BACK_FIELD,
    }
)
VERIFY_SCHEMA = probatio.Schema({probatio.Optional(CONF_VERIFICATION_CODE): str, **_BACK_FIELD})
MANUAL_SCHEMA = probatio.Schema(
    {
        probatio.Optional(CONF_AES_KEY): _PASSWORD_SELECTOR,
        probatio.Optional(CONF_UNLOCK_KEY): _PASSWORD_SELECTOR,
        probatio.Optional(CONF_ADMIN_PASSWORD): _PASSWORD_SELECTOR,
        probatio.Optional(CONF_GROUP_ID): _FRAME_ID_SELECTOR,
        probatio.Optional(CONF_ORG_ID): _FRAME_ID_SELECTOR,
        probatio.Optional(CONF_FLAG_POS): _FRAME_ID_SELECTOR,
        **_BACK_FIELD,
    }
)


def _missing(user_input: Mapping[str, Any], *fields: str) -> dict[str, str]:
    """Return a `required` error for each of `fields` left empty."""
    return {field: "required" for field in fields if not str(user_input.get(field, "")).strip()}


def _cloud_error_code(err: CloudError) -> int | None:
    """Return the numeric error code the cloud attached to `err`, if any."""
    for field in ("errorCode", "errcode"):
        try:
            return int(str(err.body[field]))
        except KeyError, ValueError:
            continue
    return None


class PopulifeConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Populife."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> PopulifeOptionsFlow:
        """Return the options flow: who may operate the safe, and whether codes show."""
        return PopulifeOptionsFlow()

    def __init__(self) -> None:
        """Initialize the flow."""
        self._discovered: dict[str, BluetoothServiceInfoBleak] = {}
        self._device_name: str | None = None
        self._lock_version: LockVersion | None = None
        self._cloud: TTLockCloud | None = None
        self._email = ""
        self._password = ""
        self._menu_step = "method"

    @property
    def _address(self) -> str:
        assert self.unique_id is not None
        return self.unique_id

    @property
    def _name(self) -> str:
        return self._device_name or self._address

    def _use_advertisement(
        self, info: BluetoothServiceInfoBleak, advertisement: LockAdvertisement
    ) -> None:
        """Take the name and firmware ids a hand-entered key needs from the safe."""
        self._device_name = info.name or None
        self._lock_version = LockVersion(
            protocolType=advertisement.protocol_type,
            protocolVersion=advertisement.protocol_version,
            scene=advertisement.scene,
            groupId=DEFAULT_GROUP_ID,
            orgId=DEFAULT_ORG_ID,
        )

    async def _async_use_entry(self, entry: ConfigEntry) -> None:
        """Replace the key of `entry`: keep its safe, name and firmware ids."""
        await self.async_set_unique_id(entry.unique_id, raise_on_progress=False)
        key = VirtualKey.from_dict(cast("dict[str, Any]", entry.data[CONF_KEY]))
        self._device_name = entry.title
        self._lock_version = key.lockVersion

    async def async_step_bluetooth(
        self, discovery_info: BluetoothServiceInfoBleak
    ) -> ConfigFlowResult:
        """Handle a safe found by Bluetooth discovery."""
        await self.async_set_unique_id(discovery_info.address.upper())
        self._abort_if_unique_id_configured()
        if (advertisement := parse_advertisement(discovery_info)) is None:
            return self.async_abort(reason="not_supported")
        self._use_advertisement(discovery_info, advertisement)
        self.context["title_placeholders"] = {"name": self._name}
        return await self.async_step_method()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Let the user pick a safe Home Assistant can currently hear."""
        if user_input is not None:
            address = user_input[CONF_ADDRESS]
            await self.async_set_unique_id(address, raise_on_progress=False)
            self._abort_if_unique_id_configured()
            info = self._discovered[address]
            advertisement = parse_advertisement(info)
            assert advertisement is not None
            self._use_advertisement(info, advertisement)
            return await self.async_step_method()

        configured = self._async_current_ids(include_ignore=False)
        for info in async_discovered_service_info(self.hass, connectable=True):
            address = info.address.upper()
            if address in configured or address in self._discovered:
                continue
            if parse_advertisement(info) is not None:
                self._discovered[address] = info
        if not self._discovered:
            # Offer a rescan instead of a dead end: a sleeping safe only shows up once its
            # keypad is touched.
            return self.async_show_menu(step_id="no_devices", menu_options=["user"])

        return self.async_show_form(
            step_id="user",
            data_schema=probatio.Schema(
                {
                    probatio.Required(CONF_ADDRESS): probatio.In(
                        {
                            address: f"{info.name or 'Populife'} ({address})"
                            for address, info in self._discovered.items()
                        }
                    )
                }
            ),
        )

    async def async_step_no_devices(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show the "no safe found" menu; its only option scans again."""
        return await self.async_step_user()

    async def async_step_method(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Ask how to obtain the safe's key."""
        return self._async_show_methods("method")

    async def async_step_reauth(self, entry_data: Mapping[str, Any]) -> ConfigFlowResult:
        """Start replacing a key the safe rejected."""
        await self._async_use_entry(self._get_reauth_entry())
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask how to obtain the new key."""
        return self._async_show_methods("reauth_confirm")

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Replace the key of a working entry, for example to add the admin password."""
        await self._async_use_entry(self._get_reconfigure_entry())
        return self._async_show_methods("reconfigure")

    def _async_show_methods(self, step_id: str | None = None) -> ConfigFlowResult:
        """Show the key-method menu; with no `step_id`, the one the user came from."""
        if step_id is not None:
            self._menu_step = step_id
        return self.async_show_menu(
            step_id=self._menu_step,
            menu_options=["cloud", "app_data", "manual"],
            description_placeholders={"name": self._name},
        )

    async def async_step_cloud(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Import the key from a TTLock-family cloud account."""
        errors: dict[str, str] = {}
        if user_input is not None and user_input.get(CONF_BACK):
            return self._async_show_methods()
        if user_input is not None and not (
            errors := _missing(user_input, CONF_EMAIL, CONF_PASSWORD)
        ):
            self._email = user_input[CONF_EMAIL].strip()
            self._password = user_input[CONF_PASSWORD]
            cloud = self._cloud = TTLockCloud(client=get_async_client(self.hass))
            try:
                await cloud.discover_site()
                await cloud.login(self._email, self._password)
            except CloudError as err:
                if _cloud_error_code(err) != ERR_NEW_DEVICE_LOGIN:
                    _LOGGER.debug("Cloud login failed: %s", err)
                    errors["base"] = "invalid_auth"
                else:
                    try:
                        await cloud.request_login_verification_code(self._email)
                    except (CloudError, httpx.HTTPError, ValueError) as code_err:
                        _LOGGER.debug("Could not request a verification code: %s", code_err)
                        errors["base"] = "cannot_connect"
                    else:
                        return await self.async_step_cloud_verify()
            except (httpx.HTTPError, ValueError) as err:
                _LOGGER.debug("Cloud unreachable: %s", err)
                errors["base"] = "cannot_connect"
            else:
                return await self._async_create_from_cloud(errors, "cloud", CLOUD_SCHEMA)

        return self.async_show_form(
            step_id="cloud",
            data_schema=self.add_suggested_values_to_schema(CLOUD_SCHEMA, user_input),
            errors=errors,
            description_placeholders={"name": self._name},
        )

    async def async_step_cloud_verify(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Confirm this Home Assistant install with the code the cloud sent."""
        errors: dict[str, str] = {}
        if user_input is not None and user_input.get(CONF_BACK):
            return self._async_show_methods()
        if user_input is not None and not (errors := _missing(user_input, CONF_VERIFICATION_CODE)):
            assert self._cloud is not None
            try:
                await self._cloud.validate_new_device(
                    self._email, user_input[CONF_VERIFICATION_CODE].strip()
                )
                await self._cloud.login(self._email, self._password)
            except CloudError as err:
                _LOGGER.debug("Verification failed: %s", err)
                errors["base"] = "invalid_code"
            except (httpx.HTTPError, ValueError) as err:
                _LOGGER.debug("Cloud unreachable: %s", err)
                errors["base"] = "cannot_connect"
            else:
                return await self._async_create_from_cloud(errors, "cloud_verify", VERIFY_SCHEMA)

        return self.async_show_form(
            step_id="cloud_verify",
            data_schema=VERIFY_SCHEMA,
            errors=errors,
            description_placeholders={"email": self._email},
        )

    async def _async_create_from_cloud(
        self, errors: dict[str, str], step_id: str, schema: probatio.Schema
    ) -> ConfigFlowResult:
        """Pick this safe's key out of the account, or re-show `step_id` with an error."""
        assert self._cloud is not None
        try:
            keys = await self._cloud.list_keys()
        except (CloudError, httpx.HTTPError, ValueError) as err:
            _LOGGER.debug("Could not list keys: %s", err)
            errors["base"] = "cannot_connect"
        else:
            matching = [key for key in keys if key.lockMac.upper() == self._address]
            if matching:
                # Prefer the owner's key: it also carries the admin password.
                key = next((key for key in matching if key.is_admin()), matching[0])
                self._password = ""
                return self._async_create(key)
            errors["base"] = "lock_not_in_account"
        return self.async_show_form(
            step_id=step_id,
            data_schema=schema,
            errors=errors,
            description_placeholders={"name": self._name, "email": self._email},
        )

    async def async_step_app_data(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Paste the lock data JSON copied from the vendor app's sync response."""
        errors: dict[str, str] = {}
        if user_input is not None and user_input.get(CONF_BACK):
            return self._async_show_methods()
        if user_input is not None and not (errors := _missing(user_input, CONF_LOCK_DATA)):
            assert self._lock_version is not None
            try:
                key = key_from_lock_data(
                    user_input[CONF_LOCK_DATA],
                    address=self._address,
                    fallback_version=self._lock_version,
                    name=self._name,
                )
            except LockDataError as err:
                errors["base"] = err.reason
            else:
                if (error := await self._async_check_key(key)) is None:
                    return self._async_create(key)
                errors["base"] = error

        # Never echo the pasted secrets back into the form.
        return self.async_show_form(
            step_id="app_data",
            data_schema=APP_DATA_SCHEMA,
            errors=errors,
            description_placeholders={"name": self._name},
        )

    async def async_step_manual(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Enter the AES key and unlock key by hand."""
        errors: dict[str, str] = {}
        if user_input is not None and user_input.get(CONF_BACK):
            return self._async_show_methods()
        if user_input is not None and not (
            errors := _missing(user_input, CONF_AES_KEY, CONF_UNLOCK_KEY)
        ):
            aes_key = user_input[CONF_AES_KEY].strip()
            unlock_key = decode_secret(user_input[CONF_UNLOCK_KEY])
            admin_input = user_input.get(CONF_ADMIN_PASSWORD, "").strip()
            admin_password = decode_secret(admin_input) if admin_input else ""
            try:
                hex_key_to_bytes(aes_key)
            except ValueError:
                errors[CONF_AES_KEY] = "invalid_aes_key"
            if unlock_key is None:
                errors[CONF_UNLOCK_KEY] = "invalid_unlock_key"
            if admin_password is None:
                errors[CONF_ADMIN_PASSWORD] = "invalid_admin_password"
            if not errors:
                assert unlock_key is not None
                assert admin_password is not None
                assert self._lock_version is not None
                self._lock_version = replace(
                    self._lock_version,
                    groupId=int(user_input.get(CONF_GROUP_ID, self._lock_version.groupId)),
                    orgId=int(user_input.get(CONF_ORG_ID, self._lock_version.orgId)),
                )
                flag_pos = int(user_input.get(CONF_FLAG_POS, 0))
                key = self._manual_key(aes_key, unlock_key, admin_password, flag_pos)
                if (error := await self._async_check_key(key)) is None:
                    return self._async_create(key)
                errors["base"] = error

        assert self._lock_version is not None
        # Prefill the frame ids with what we know: the defaults for a new safe, or the
        # entry's own ids during reauth and reconfigure.
        suggested = {
            CONF_GROUP_ID: self._lock_version.groupId,
            CONF_ORG_ID: self._lock_version.orgId,
            CONF_FLAG_POS: 0,
            **(user_input or {}),
        }
        return self.async_show_form(
            step_id="manual",
            data_schema=self.add_suggested_values_to_schema(MANUAL_SCHEMA, suggested),
            errors=errors,
            description_placeholders={"name": self._name},
        )

    def _manual_key(
        self, aes_key: str, unlock_key: str, admin_password: str, flag_pos: int
    ) -> VirtualKey:
        """Build a key from hand-entered secrets and the safe's firmware ids."""
        assert self._lock_version is not None
        return VirtualKey(
            keyId=0,
            lockId=0,
            lockMac=self._address,
            lockAlias=self._name,
            lockName=self._name,
            lockVersion=self._lock_version,
            aesKeyStr=aes_key,
            unlockKey=unlock_key,
            lockFlagPos=flag_pos,
            timezoneRawOffSet=0,
            adminPs=admin_password,
        )

    async def _async_check_key(self, key: VirtualKey) -> str | None:
        """Talk to the safe once so a wrong AES key fails here, not at first use."""
        device = async_ble_device_from_address(self.hass, self._address, connectable=True)
        if device is None:
            return "cannot_connect"
        client = TTLockClient.from_ble_device(device, key, keep_alive_after_command=0)
        try:
            async with client:
                await client.query_state()
        except (TTLockError, BleakError, TimeoutError) as err:
            _LOGGER.debug("Key check failed: %s", err)
            return "cannot_connect"
        return None

    def _async_create(self, key: VirtualKey) -> ConfigFlowResult:
        if self.source == SOURCE_REAUTH:
            return self.async_update_reload_and_abort(
                self._get_reauth_entry(), data_updates={CONF_KEY: key.to_dict()}
            )
        if self.source == SOURCE_RECONFIGURE:
            return self.async_update_reload_and_abort(
                self._get_reconfigure_entry(), data_updates={CONF_KEY: key.to_dict()}
            )
        return self.async_create_entry(
            title=key.lockAlias or key.lockName or self._name,
            data={CONF_ADDRESS: self._address, CONF_KEY: key.to_dict()},
        )


class PopulifeOptionsFlow(OptionsFlow):
    """Pick who besides admins may operate the safe, and whether full codes show."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Show and save the options."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        # Admins may always operate the safe, so only the other people are offered.
        users = [
            SelectOptionDict(value=user.id, label=user.name or user.id)
            for user in await self.hass.auth.async_get_users()
            if not user.system_generated and user.is_active and not user.is_admin
        ]
        schema = probatio.Schema(
            {
                probatio.Optional(CONF_ALLOWED_USERS, default=[]): SelectSelector(
                    SelectSelectorConfig(options=users, multiple=True, mode=SelectSelectorMode.LIST)
                ),
                probatio.Optional(CONF_SHOW_PASSCODES, default=False): BooleanSelector(),
            }
        )
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(schema, self.config_entry.options),
        )
