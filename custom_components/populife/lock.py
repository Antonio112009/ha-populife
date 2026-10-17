"""Lock entity for a Populife safe, with the keypad passcode actions."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Final, cast, override

import probatio
from ttlock_ble import LockState

from homeassistant.components.lock import LockEntity
from homeassistant.core import SupportsResponse
from homeassistant.helpers import config_validation as cv, entity_platform

from .entity import PopulifeEntity

if TYPE_CHECKING:
    import datetime as dt

    from homeassistant.core import HomeAssistant, ServiceResponse
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
    from homeassistant.util.json import JsonValueType

    from .coordinator import PopulifeConfigEntry

# Commands run one at a time through the coordinator's lock.
PARALLEL_UPDATES = 0

ATTR_CODE: Final = "code"
ATTR_START: Final = "start"
ATTR_END: Final = "end"
ATTR_NAME: Final = "name"
SERVICE_ADD_PASSCODE: Final = "add_passcode"
SERVICE_DELETE_PASSCODE: Final = "delete_passcode"
SERVICE_CLEAR_PASSCODES: Final = "clear_passcodes"
SERVICE_LIST_PASSCODES: Final = "list_passcodes"
SERVICE_LIST_FINGERPRINTS: Final = "list_fingerprints"

# The keypad accepts 4 to 9 digits.
_CODE = cv.matches_regex(r"^\d{4,9}$")


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the lock entity and its passcode actions."""
    async_add_entities([PopulifeLock(entry.runtime_data, "lock")])

    platform = entity_platform.async_get_current_platform()
    platform.async_register_entity_service(
        SERVICE_ADD_PASSCODE,
        {
            probatio.Required(ATTR_CODE): _CODE,
            probatio.Optional(ATTR_START): cv.datetime,
            probatio.Optional(ATTR_END): cv.datetime,
            probatio.Optional(ATTR_NAME): cv.string,
        },
        "async_add_passcode",
    )
    platform.async_register_entity_service(
        SERVICE_DELETE_PASSCODE,
        {probatio.Required(ATTR_CODE): _CODE},
        "async_delete_passcode",
    )
    platform.async_register_entity_service(SERVICE_CLEAR_PASSCODES, None, "async_clear_passcodes")
    platform.async_register_entity_service(
        SERVICE_LIST_PASSCODES,
        None,
        "async_list_passcodes",
        supports_response=SupportsResponse.ONLY,
    )
    platform.async_register_entity_service(
        SERVICE_LIST_FINGERPRINTS,
        None,
        "async_list_fingerprints",
        supports_response=SupportsResponse.ONLY,
    )


class PopulifeLock(PopulifeEntity, LockEntity):
    """The safe's bolt."""

    _attr_name = None

    @property
    @override
    def is_locked(self) -> bool | None:
        """Return True when the bolt is thrown, None until it has been seen."""
        if (state := self.coordinator.state.lock_state) is None:
            return None
        return state is LockState.LOCKED

    @property
    @override
    def is_locking(self) -> bool:
        """Return True while a lock command is in flight."""
        return self.coordinator.state.is_locking

    @property
    @override
    def is_unlocking(self) -> bool:
        """Return True while an unlock command is in flight."""
        return self.coordinator.state.is_unlocking

    @override
    async def async_lock(self, **kwargs: Any) -> None:
        """Lock the safe."""
        await self.async_check_access()
        await self.coordinator.async_lock(await self.async_actor())

    @override
    async def async_unlock(self, **kwargs: Any) -> None:
        """Unlock the safe."""
        await self.async_check_access()
        await self.coordinator.async_unlock(await self.async_actor())

    async def async_add_passcode(
        self,
        code: str,
        start: dt.datetime | None = None,
        end: dt.datetime | None = None,
        name: str | None = None,
    ) -> None:
        """Add a keypad passcode, permanent unless `end` is given, optionally named."""
        await self.async_check_access()
        await self.coordinator.async_add_passcode(code, start, end, name)

    async def async_delete_passcode(self, code: str) -> None:
        """Delete a keypad passcode."""
        await self.async_check_access()
        await self.coordinator.async_delete_passcode(code)

    async def async_clear_passcodes(self) -> None:
        """Delete every keypad passcode."""
        await self.async_check_access()
        await self.coordinator.async_clear_passcodes()

    async def async_list_passcodes(self) -> ServiceResponse:
        """Return the keypad passcodes the safe reports."""
        await self.async_check_access()
        passcodes = await self.coordinator.async_list_passcodes()
        return {"passcodes": cast("list[JsonValueType]", passcodes)}

    async def async_list_fingerprints(self) -> ServiceResponse:
        """Return the enrolled fingerprints: slot and validity."""
        await self.async_check_access()
        fingerprints = await self.coordinator.async_list_fingerprints()
        return {"fingerprints": cast("list[JsonValueType]", fingerprints)}
