"""Sensors for a Populife safe."""

from __future__ import annotations

from dataclasses import dataclass
import datetime as dt
from typing import TYPE_CHECKING, override

from homeassistant.components.sensor import (
    RestoreSensor,
    SensorDeviceClass,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import (
    PERCENTAGE,
    SIGNAL_STRENGTH_DECIBELS_MILLIWATT,
    EntityCategory,
    UnitOfTime,
)

from .entity import PopulifeEntity
from .operation_log import UNLOCK_METHODS

if TYPE_CHECKING:
    from collections.abc import Callable

    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry, PopulifeCoordinator, PopulifeState

PARALLEL_UPDATES = 0

type SensorValue = int | float | str | dt.datetime | None


@dataclass(frozen=True, kw_only=True)
class PopulifeSensorEntityDescription(SensorEntityDescription):
    """Describes a Populife sensor."""

    value_fn: Callable[[PopulifeState], SensorValue]
    # Values that come from the operation log survive restarts: the log only reports
    # records once, so they would otherwise stay unknown until the safe is used again.
    restore_fn: Callable[[PopulifeState, object], None] | None = None
    # Read with the admin handshake, so only created for admin keys.
    admin_only: bool = False
    attributes_fn: Callable[[PopulifeCoordinator], dict[str, object]] | None = None


def _restore_last_unlock(state: PopulifeState, value: object) -> None:
    if state.last_unlock is None and isinstance(value, dt.datetime):
        state.last_unlock = value


def _restore_last_unlock_method(state: PopulifeState, value: object) -> None:
    if state.last_unlock_method is None and isinstance(value, str):
        state.last_unlock_method = value


def _restore_last_unlock_user(state: PopulifeState, value: object) -> None:
    if state.last_unlock_user is None and isinstance(value, str):
        state.last_unlock_user = value


SENSORS: tuple[PopulifeSensorEntityDescription, ...] = (
    PopulifeSensorEntityDescription(
        key="battery",
        device_class=SensorDeviceClass.BATTERY,
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda state: state.battery,
    ),
    PopulifeSensorEntityDescription(
        key="rssi",
        device_class=SensorDeviceClass.SIGNAL_STRENGTH,
        native_unit_of_measurement=SIGNAL_STRENGTH_DECIBELS_MILLIWATT,
        state_class=SensorStateClass.MEASUREMENT,
        entity_category=EntityCategory.DIAGNOSTIC,
        entity_registry_enabled_default=False,
        value_fn=lambda state: state.rssi,
    ),
    PopulifeSensorEntityDescription(
        key="last_unlock",
        translation_key="last_unlock",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=lambda state: state.last_unlock,
        restore_fn=_restore_last_unlock,
    ),
    PopulifeSensorEntityDescription(
        key="last_unlock_method",
        translation_key="last_unlock_method",
        device_class=SensorDeviceClass.ENUM,
        options=list(UNLOCK_METHODS),
        value_fn=lambda state: state.last_unlock_method,
        restore_fn=_restore_last_unlock_method,
    ),
    PopulifeSensorEntityDescription(
        key="last_unlock_user",
        translation_key="last_unlock_user",
        value_fn=lambda state: state.last_unlock_user,
        restore_fn=_restore_last_unlock_user,
        admin_only=True,
    ),
    PopulifeSensorEntityDescription(
        key="clock_drift",
        translation_key="clock_drift",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement=UnitOfTime.SECONDS,
        state_class=SensorStateClass.MEASUREMENT,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda state: state.clock_drift,
    ),
    PopulifeSensorEntityDescription(
        key="fingerprints",
        translation_key="fingerprints",
        state_class=SensorStateClass.MEASUREMENT,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda state: state.fingerprint_count,
        admin_only=True,
    ),
    PopulifeSensorEntityDescription(
        key="passcodes",
        translation_key="passcodes",
        state_class=SensorStateClass.MEASUREMENT,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda state: state.passcode_count,
        admin_only=True,
        attributes_fn=lambda coordinator: {"passcodes": coordinator.passcode_overview()},
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the sensors."""
    coordinator = entry.runtime_data
    async_add_entities(
        PopulifeSensor(coordinator, description)
        for description in SENSORS
        if coordinator.has_admin or not description.admin_only
    )


class PopulifeSensor(PopulifeEntity, RestoreSensor):
    """A value read from the safe's advertisements or its operation log."""

    entity_description: PopulifeSensorEntityDescription
    # The passcode list holds the codes themselves: show it, but keep it out of the history.
    _unrecorded_attributes = frozenset({"passcodes"})

    def __init__(
        self,
        coordinator: PopulifeCoordinator,
        description: PopulifeSensorEntityDescription,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, description.key)
        self.entity_description = description

    @override
    async def async_added_to_hass(self) -> None:
        """Restore the last value of log-based sensors."""
        await super().async_added_to_hass()
        if (restore := self.entity_description.restore_fn) is not None and (
            last := await self.async_get_last_sensor_data()
        ) is not None:
            restore(self.coordinator.state, last.native_value)

    @property
    @override
    def native_value(self) -> SensorValue:
        """Return the sensor value."""
        return self.entity_description.value_fn(self.coordinator.state)

    @property
    @override
    def extra_state_attributes(self) -> dict[str, object] | None:
        """Return the passcode list on the passcodes sensor."""
        if (attributes_fn := self.entity_description.attributes_fn) is None:
            return None
        return attributes_fn(self.coordinator)
