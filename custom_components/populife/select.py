"""Selects for a Populife safe (admin keys).

The beep volume, and the passcode console's "type" and "passcode to delete" fields.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, override

from ttlock_ble import LockVolume

from homeassistant.components.select import SelectEntity
from homeassistant.const import EntityCategory
from homeassistant.core import callback

from .entity import PopulifeEntity
from .passcodes import PASSCODE_TYPES

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry

# Commands run one at a time through the coordinator's lock.
PARALLEL_UPDATES = 0

OPTIONS = [volume.name.lower() for volume in LockVolume]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add the volume select once the safe reports a volume.

    Safes with a plain beeper report none, and setting one would be a silent no-op, so the
    entity only appears for safes that have the setting.
    """
    coordinator = entry.runtime_data
    if not coordinator.has_admin:
        return
    async_add_entities(
        [
            PopulifePasscodeTypeSelect(coordinator, "passcode_type"),
            PopulifePasscodeDeleteSelect(coordinator, "passcode_delete"),
        ]
    )
    added = False

    @callback
    def _async_add_when_supported() -> None:
        nonlocal added
        if not added and coordinator.state.lock_volume is not None:
            added = True
            async_add_entities([PopulifeVolumeSelect(coordinator, "lock_volume")])

    _async_add_when_supported()
    entry.async_on_unload(coordinator.async_add_listener(_async_add_when_supported))


class PopulifeVolumeSelect(PopulifeEntity, SelectEntity):
    """How loud the keypad and bolt beep."""

    _attr_translation_key = "lock_volume"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_options = OPTIONS

    @property
    @override
    def current_option(self) -> str | None:
        """Return the volume level, None until it has been read."""
        volume = self.coordinator.state.lock_volume
        return volume.name.lower() if volume is not None else None

    @override
    async def async_select_option(self, option: str) -> None:
        """Set the volume."""
        await self.async_check_access()
        await self.coordinator.async_set_lock_volume(LockVolume[option.upper()])


class PopulifePasscodeTypeSelect(PopulifeEntity, SelectEntity):
    """Whether the console adds a permanent or a temporary passcode."""

    _attr_translation_key = "passcode_type"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_options = list(PASSCODE_TYPES)  # noqa: RUF012 - Home Assistant's attribute pattern

    @property
    @override
    def current_option(self) -> str:
        """Return the type in the form."""
        return self.coordinator.draft.type

    @override
    async def async_select_option(self, option: str) -> None:
        """Set the type."""
        await self.async_check_access()
        self.coordinator.async_update_draft(type=option)


class PopulifePasscodeDeleteSelect(PopulifeEntity, SelectEntity):
    """The passcode the console's delete button removes, listed by name."""

    _attr_translation_key = "passcode_delete"
    _attr_entity_category = EntityCategory.CONFIG

    def _labels(self) -> dict[str, str]:
        """Return {label: code}, labelling each code with its name when it has one.

        Labels show the code as every user may see it, so masked codes can repeat; a
        number keeps each label unique.
        """
        labels: dict[str, str] = {}
        for row in self.coordinator.passcode_overview():
            shown = self.coordinator.public_code(row["code"])
            label = base = f"{row['name']} ({shown})" if row["name"] else shown
            number = 2
            while label in labels:
                label, number = f"{base} #{number}", number + 1
            labels[label] = row["code"]
        return labels

    @property
    @override
    def options(self) -> list[str]:
        """Return the known passcodes."""
        return list(self._labels())

    @property
    @override
    def current_option(self) -> str | None:
        """Return the passcode picked for deletion."""
        code = self.coordinator.draft.delete_code
        return next((label for label, value in self._labels().items() if value == code), None)

    @override
    async def async_select_option(self, option: str) -> None:
        """Pick a passcode."""
        await self.async_check_access()
        self.coordinator.async_update_draft(delete_code=self._labels()[option])
